(() => {
  'use strict';
  const C = CikeCore, KEY = 'cike.personal.v1';
  const $ = sel => document.querySelector(sel);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state = C.initial(), view = 'now', closed = false, showArchived = false, storageError = '', toastTimer;
  try { const raw = localStorage.getItem(KEY); if (raw) { const saved = JSON.parse(raw); if (!C.validState(saved)) throw Error('invalid'); state = saved; } }
  catch { storageError = '暂时无法读取已存进度。为保护原数据，本次不会自动覆盖；请先导出备份，或换回原来使用的浏览器。'; }
  let readError = !!storageError;
  const icons = {
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    direction:'<path d="m12 3 8 18-8-5-8 5 8-18Z"/>',
    leaf:'<path d="M20 3C8 2 2 9 6 16c7 5 15-1 14-13Z"/><path d="m4 21 11-12"/>',
    steps:'<path d="M4 18h5v-5h5V8h6M4 22v-4M20 4v4"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
    arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    edit:'<path d="m4 16-1 5 5-1L20 8l-4-4L4 16ZM13 7l4 4"/>',
    play:'<path d="m8 4 12 8-12 8V4Z"/>',
    pause:'<path d="M8 5v14M16 5v14"/>',
    check:'<path d="m5 12 4 4L20 5"/>',
    cup:'<path d="M4 8h12v7a6 6 0 0 1-12 0V8Zm12 1h2a3 3 0 0 1 0 6h-2M7 3v2m5-2v2M2 22h18"/>',
    low:'<path d="M5 11h14M8 16h8"/><circle cx="12" cy="12" r="10"/>',
    steady:'<path d="M7 10h1m8 0h1M8 15q4 3 8 0"/><circle cx="12" cy="12" r="10"/>',
    high:'<path d="M7 9h1m8 0h1M7 14q5 7 10 0Z"/><circle cx="12" cy="12" r="10"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    back:'<path d="M20 12H5m6-6-6 6 6 6"/>',
    split:'<path d="M12 21v-7M5 3v4a7 7 0 0 0 7 7 7 7 0 0 0 7-7V3M2 6l3-3 3 3m8 0 3-3 3 3"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.leaf}</svg>`;
  const mark = `<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 20C3 20 3 4 12 4c7 0 8 10 8 16Z" fill="#6d805b"/><path d="M20 20c0-17 16-17 16-8 0 7-10 8-16 8Z" fill="#879779"/><path d="M20 20c17 0 17 16 8 16-7 0-8-10-8-16Z" fill="#b1bca0"/><path d="M20 20c0 17-16 17-16 8 0-7 10-8 16-8Z" fill="#93a580"/></svg>`;
  function persist() {
    if (readError) return;
    try { localStorage.setItem(KEY, JSON.stringify(state)); storageError = ''; }
    catch { storageError = '浏览器暂时无法保存。请在「使用说明」中导出备份，避免关闭页面后丢失进度。'; }
  }
  function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 3500); }
  const goal = id => state.goals.find(g => g.id === (id || state.activeGoalId));
  const dateText = () => new Intl.DateTimeFormat('zh-CN', {month:'long',day:'numeric',weekday:'long'}).format(new Date());
  const energyText = {low:'有点累',steady:'还不错',high:'很有精神'};
  const energyNotes = {low:'那就再小一点，或者先休息。两种选择都很好。',steady:'用一个刚刚好的小行动，慢慢进入状态。',high:'有精力，也只需要专注于眼前的一步。'};
  function energyPicker() { return `<div class="energy-header">此刻，你的精力怎么样？<span>按真实感受选择</span></div><div class="energy-options" role="group" aria-label="当前精力">${Object.keys(energyText).map(e => `<button type="button" class="energy ${state.energy===e?'selected':''}" aria-pressed="${state.energy===e}" data-action="energy" data-value="${e}">${icon(e)}${energyText[e]}</button>`).join('')}</div><p class="energy-note">${energyNotes[state.energy]}</p>`; }
  function sideContent(focus = false) { return `<aside class="right-col"><div class="breathing-card"><div class="section-label">${icon('leaf')} 此刻的留白</div><div class="garden"><svg viewBox="0 0 170 170" fill="none" aria-hidden="true"><circle class="halo" cx="85" cy="85" r="66" stroke="#cdd8bd" stroke-dasharray="2 5"/><circle cx="85" cy="85" r="48" fill="#e2ead7"/><circle cx="147" cy="63" r="4" fill="#c0cba7"/><g class="sprout"><path d="M82 130c0-35 3-48 15-74" stroke="#899a70" stroke-width="1.5"/><path d="M87 100C53 104 43 80 50 70c22 2 35 12 37 30Z" fill="#a6b691"/><path d="M91 83c0-26 23-36 37-32-2 24-17 34-37 32Z" fill="#bac7a4"/><path d="M83 117c-23 2-32-12-28-22 17 1 26 9 28 22Z" fill="#c5cfb0"/></g><ellipse cx="86" cy="135" rx="32" ry="3" fill="#d7e0ca"/></svg></div><blockquote>不必一次想清楚所有事。<br>只要有一个，<br>可以开始的下一步。</blockquote><p>慢一点，也是在靠近。</p></div><div class="margin-note">${focus ? `<div class="mini-title">${icon('edit')} 暂存一个念头</div><p>分心时先放在这里，等会儿再照顾它。</p><label class="visually-hidden" for="scratch">暂存念头</label><textarea id="scratch" class="scratch" maxlength="20000" placeholder="突然想起的事，不用现在处理……">${esc(state.scratch)}</textarea><div class="scratch-label">随输入保存</div>` : `<div class="mini-title">${icon('clock')} 10 分钟，只是一个起点</div><p>到点可以停，也可以继续。<br>休息不需要理由，更不必等到完成以后。</p>`}</div></aside>`; }
  function pathStrip(stage) { return `<div class="path-strip" aria-label="此刻的过程">${['明确方向','看看状态','一小步 / 休息','回看与选择'].map((x,i) => `${i?'<i>→</i>':''}<span class="${stage===i?'current':''}">${i===stage?'●':'○'} ${x}</span>`).join('')}</div>`; }
  function welcome() { return `<header class="welcome ${state.session ? 'compact' : ''}"><div><div class="eyebrow">A LITTLE SPACE, JUST FOR YOU</div><h1><span class="headline-first">把注意力，</span>交还给自己。</h1><p>大目标可以慢慢来。此刻，选择一个适合自己的小行动。</p></div><div class="edition">one small step</div></header>`; }
  function setupView() {
    const g = goal();
    return `${welcome()}<div class="columns"><div><section class="card"><div class="card-heading"><div class="section-label"><span class="number">01</span> 我想慢慢靠近的方向</div>${g?`<button class="quiet" data-action="edit-goal" data-id="${esc(g.id)}">${icon('edit')}修改</button>`:''}</div>${g ? `<h2 class="goal-title">${esc(g.title)}</h2><p class="goal-why">${esc(g.why || '方向在这里，不用一口气走完。')}</p>` : `<form id="goal-form"><label class="field" for="goal-title">最近，你想做成什么？</label><textarea id="goal-title" name="title" class="goal-input" required maxlength="300" placeholder="比如：写出第一篇公众号文章"></textarea><label class="field" for="goal-why">为什么这件事对你重要？<small>选填</small></label><input id="goal-why" name="why" type="text" maxlength="1000" placeholder="留一句给自己的话"></form>`}<hr class="thin-rule">${energyPicker()}${state.draft && g ? draftView() : `<div class="actions"><button class="primary" ${g?'data-action="suggest"':'type="submit" form="goal-form"'}>帮我拆出${g&&g.nextIndex?'下一步':'第一步'} ${icon('arrow')}</button><button class="secondary" data-action="rest">${icon('cup')} 我想先休息</button></div><div class="helper">${icon('leaf')} 不用规划所有步骤，先找到一个可以开始的地方。</div>`}</section>${pathStrip(state.draft?2:0)}</div>${sideContent()}</div>`;
  }
  function draftView() { const d = state.draft; return `<div class="draft-card"><div class="draft-top"><div class="section-label">你的下一小步</div><span class="pill">约 ${d.minutes} 分钟</span></div><h2>${esc(d.title)}</h2><div class="criterion"><strong>做到这里，就可以停</strong>${esc(d.doneWhen)}</div><div class="draft-tools"><button class="quiet" data-action="edit-draft">${icon('edit')}我来改一改</button><button class="quiet" data-action="smaller" ${d.level>=2?'disabled':''}>${icon('split')}${d.level>=2?'已经拆到最小起点':'还是有点大，再拆小'}</button></div></div><div class="actions"><button class="primary" data-action="start-action">${icon('play')}就从这一小步开始</button><button class="secondary" data-action="rest">${icon('cup')}先休息也可以</button></div><div class="helper">${d.template?'本地模板建议 · 可以按你的实际情况修改':'按你的想法调整好了，准备好就开始。'}</div>`; }
  function focusView() {
    const s = state.session, isRest = s.kind==='rest', check = s.status==='checkin';
    return `${welcome()}<div class="columns"><div><section class="card focus-card"><div class="card-heading"><div class="section-label">${icon(isRest?'cup':'sun')}${isRest?'休息，也是一种行动':'此刻，只做这一件'}</div><span class="pill">${isRest?'给自己一点空白':'按自己的节奏'}</span></div>${goal(s.goalId)&&!isRest?`<p class="session-goal">朝着「${esc(goal(s.goalId).title)}」</p>`:''}<h2>${esc(s.title)}</h2><div class="criterion"><strong>${isRest?'此刻的许可':'做到这里，就可以停'}</strong>${esc(s.doneWhen)}</div><div class="timer-wrap"><svg viewBox="0 0 220 220" aria-hidden="true"><circle class="timer-track" cx="110" cy="110" r="100"/><circle id="timer-progress" class="timer-progress" cx="110" cy="110" r="100" stroke-dasharray="628.319" stroke-dashoffset="0"/></svg><div class="timer-content"><div class="time" id="timer-time">${timerText(s)}</div><div class="timer-status" id="timer-status">${statusText(s)}</div></div></div>${check?`<div class="checkin" role="status">时间到，只是邀请你回看一下。<br>${isRest?'还想多歇一会儿，完全可以。':'这一步是否完成，由你决定。'}</div>`:''}<div class="actions">${check?`<button class="secondary" data-action="extend">${icon('plus')}再给自己 5 分钟</button>`:`<button class="secondary" data-action="toggle-timer">${icon(s.status==='running'?'pause':'play')}${s.status==='running'?'暂停一下':s.status==='ready'?'开始':'继续计时'}</button>`}<button class="primary" data-action="finish" data-value="${isRest?'rested':'complete'}">${icon('check')}${isRest?'休息好了，看看状态':'这一步完成了'}</button></div><div class="focus-subactions">${isRest?'':`<button class="quiet" data-action="rest">${icon('cup')}我想休息</button><button class="quiet" data-action="finish" data-value="stuck">${icon('split')}卡住了，再拆小</button>`}<button class="quiet" data-action="finish" data-value="${isRest?'rested':'partial'}">${isRest?'结束这次休息':'做了一点，先停下'}</button></div></section>${pathStrip(2)}</div>${sideContent(true)}</div>`;
  }
  function statusText(s) { return s.status==='running'?(s.kind==='rest'?'好好休息，就很好':'慢慢来，专注于这一小步'):s.status==='checkin'?'可以停下来看看了':s.status==='ready'?'准备好了，再开始':'已暂停 · 不用着急'; }
  function timerText(s) { const seconds = Math.max(0, Math.ceil((s.plannedSeconds * 1000 - C.elapsed(s))/1000)); return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`; }
  function updateTimer() { const s = state.session; if (!s) { document.title = '此刻 · 把注意力，交还给自己'; return; } const changed = C.reconcile(s); if (changed) { persist(); render(); document.title = '此刻 · 停下来看看也很好'; return; } if ($('#timer-time')) { $('#timer-time').textContent = timerText(s); $('#timer-progress').style.strokeDashoffset = 628.319 * Math.min(1,C.elapsed(s)/(s.plannedSeconds*1000)); } document.title = s.status==='running'?`${timerText(s)} · ${s.kind==='rest'?'此刻休息':'此刻专注'}`:'此刻 · 按自己的节奏'; }
  function reviewView() {
    const r = state.review, event = state.history.find(e=>e.id===r.eventId), rest = r.kind==='rest';
    const title = rest?'欢迎回来，感觉怎么样？':r.outcome==='complete'?'这一小步，已经走过了。':r.outcome==='stuck'?'卡住了，也可以重新选。':'做了一点，也值得被看见。';
    const recommendation = state.energy==='low'?'现在有些累。可以休息一会儿，也可以把今天收好。':r.outcome==='stuck'?'把范围再缩小一点，先留下一个最粗糙的起点。':rest&&state.suspended?'之前的行动和计时都还在。你可以回去看看，再决定是否继续。':'有余力的话，再选择一小步；今天到这里也很好。';
    return `${welcome()}<div class="columns"><div><section class="card"><div class="review-icon">${icon(rest?'leaf':r.outcome==='complete'?'check':'sun')}</div><h2 class="review-title">${title}</h2><div class="review-subtitle">${esc(r.title)}</div>${energyPicker()}<label class="field" for="review-note">给下一次的自己留一句话<small>选填</small></label><textarea class="review-note" id="review-note" maxlength="5000" placeholder="做到哪里了？下次从哪里接着开始？">${esc(event?.note || '')}</textarea><div class="recommendation">${recommendation}</div><div class="actions">${rest&&state.suspended?`<button class="${state.energy==='low'?'secondary':'primary'}" data-action="resume-suspended">${icon('back')}回到刚才那一步</button>`:goal(r.goalId)?`<button class="${state.energy==='low'?'secondary':'primary'}" data-action="next">${icon(r.outcome==='stuck'?'split':'arrow')}${r.outcome==='stuck'?'把这一步再拆小':r.outcome==='complete'?'选择下一小步':'重新选择一小步'}</button>`:`<button class="secondary" data-action="back-home">看看我的方向</button>`}<button class="${state.energy==='low'?'primary':'secondary'}" data-action="rest">${icon('cup')}${rest?'再休息一会儿':'去休息一下'}</button><button class="quiet" data-action="end-day">今天就到这里</button></div></section>${pathStrip(3)}</div>${sideContent()}</div>`;
  }
  function closedView() { return `${welcome()}<div class="columns"><section class="card closed-card"><div class="review-icon">${icon('leaf')}</div><h2>今天，就先到这里。</h2><p>做过的已经留下。<br>还没做完的，可以等下一次的你。</p><div class="actions"><button class="secondary" data-action="back-home">准备好了，再回来</button></div></section>${sideContent()}</div>`; }
  function remindSession() { return state.session||state.review?`<div class="session-reminder"><span>${state.session?'当前这一步还在，随时可以回去。':'还有一次回看，等你作出选择。'}</span><button class="quiet" data-action="nav" data-view="now">回到此刻 ${icon('arrow')}</button></div>`:''; }
  function goalsView() { const gs = state.goals.filter(g=>showArchived||!g.archived); return `<div class="page-head"><div><div class="eyebrow">YOUR DIRECTIONS</div><h1>我的方向</h1><p>存放想慢慢靠近的事，每次只选择一个方向。</p></div><button class="primary" data-action="new-goal">${icon('plus')}添加方向</button></div>${remindSession()}${gs.length?`<div class="list">${gs.map(g=>`<article class="card goal-item ${g.archived?'archived':''}"><div class="section-label">${icon('direction')}${g.archived?'已收起的方向':g.id===state.activeGoalId?'此刻的方向':'留在这里，慢慢来'}</div><h2>${esc(g.title)}</h2><p>${esc(g.why||'不需要马上开始。')}</p><div class="actions">${g.archived?`<button class="secondary small" data-action="restore-goal" data-id="${esc(g.id)}">重新展开</button>`:`<button class="secondary small" data-action="select-goal" data-id="${esc(g.id)}">${g.id===state.activeGoalId?'回到这个方向':'选择这个方向'} ${icon('arrow')}</button><button class="quiet" data-action="edit-goal" data-id="${esc(g.id)}">修改</button><button class="quiet" data-action="archive-goal" data-id="${esc(g.id)}">暂时收起</button>`}</div></article>`).join('')}</div>`:`<div class="empty">${icon('direction')}<h2>给心里那件事，留个位置。</h2><p>写下一个想做成的目标，然后只看眼前一小步。</p><button class="primary" data-action="new-goal">写下第一个方向</button></div>`}${state.goals.some(g=>g.archived)?`<button class="quiet toggle-archive" data-action="toggle-archived">${showArchived?'隐藏已收起的方向':'看看已收起的方向'}</button>`:''}`; }
  const outcomes = {complete:'完成了一小步',partial:'做了一点',stuck:'停下来调整',ended:'先收好',rested:'主动休息'};
  function historyView() {
    let day = '';
    return `<div class="page-head"><div><div class="eyebrow">LITTLE MOMENTS MATTER</div><h1>走过的小步</h1><p>留下进展，也留下休息。不比较，不追赶。</p></div>${state.history.length?`<button class="secondary small" data-action="export-history">${icon('download')}导出记录</button>`:''}</div>${remindSession()}${state.history.length?state.history.map(e=>{const date = new Date(e.at); const label = date.toLocaleDateString('zh-CN',{year:'numeric',month:'long',day:'numeric'});const heading=day===label?'':`<div class="history-day">${esc(label)}</div>`;day=label;return `${heading}<article class="history-item"><div class="history-meta"><span>${date.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</span><span class="pill ${e.kind==='rest'?'rest':e.outcome!=='complete'?'partial':''}">${outcomes[e.outcome]}</span><span>${e.elapsedMs<60000?'不到 1 分钟':`${Math.floor(e.elapsedMs/60000)} 分钟`}</span><span>${energyText[e.energy]||''}</span></div><h3>${esc(e.title)}</h3>${goal(e.goalId)&&e.kind==='action'?`<p>方向 · ${esc(goal(e.goalId).title)}</p>`:''}${e.note?`<p>留给自己的话 · ${esc(e.note)}</p>`:''}</article>`}).join(''):`<div class="empty">${icon('steps')}<h2>每一个小小的选择，都算数。</h2><p>开始一次行动或主动休息后，这里会留下你的足迹。</p><button class="primary" data-action="nav" data-view="now">回到此刻 ${icon('arrow')}</button></div>`}`;
  }
  function aboutView() { return `<div class="page-head"><div><div class="eyebrow">MAKE ROOM FOR YOURSELF</div><h1>关于此刻</h1><p>一个属于你的、可以反复回来的小空间。</p></div></div><div class="about"><section class="card"><h2>下一步清楚一点，心里就轻一点。</h2><p>此刻来自你对注意力的思考：把目标拆到现在就能开始，也把休息认真放进过程。每个行动都包含「做什么」「做到哪里可以停」和一个可以调整的时长。</p><p>10 分钟只是帮助开始的尺度。到点后，计时停在回看处；是否完成、是否继续，都由你选择。休息可以是第一步，下一轮也不会自动开始。</p></section><section class="card"><h2>行动建议如何产生？</h2><p>当前版本使用本地模板，根据目标关键词和自报精力给出一个起点，涵盖写作、学习、产品与方案、整理、活动和通用目标。建议不会调用在线 AI，也不会理解完整项目背景。开始前请按你的实际情况修改，尤其是完成标准。</p><p>如果还是太大，点「再拆小」。如果做了一点却还没完成，点「做了一点，先停下」；进展和精力会分别记录。</p></section><section class="card"><h2>这是你的注意力空间</h2><form id="owner-form"><label class="field" for="owner">我怎么称呼你</label><div class="inline-fields"><input id="owner" name="owner" type="text" maxlength="40" required value="${esc(state.owner)}" style="flex:1;min-width:130px"><button class="secondary" type="submit">保存称呼</button></div></form></section><section class="card"><h2>把进度留在自己手里</h2><p>所有目标、念头和记录只保存在当前浏览器中，不会上传，也不会在设备间自动同步。清理浏览器数据、换浏览器或移动本地文件可能让旧进度无法读取。建议定期导出备份，再在需要时导入。</p><p>计时按现实时间计算，刷新页面仍会保留进度；关闭页面期间无法发出提醒，再打开时会显示回看状态。</p><div class="actions"><button class="secondary" data-action="export">${icon('download')}导出完整备份</button><button class="secondary" data-action="import">导入备份</button></div></section><section class="card"><h2>最初的想法</h2><p>根据你分享的「目标行动拆解工具」对话制作。任务、计时和主动休息的组织方式参考 Super Productivity 的产品思路；此刻的代码独立实现。</p><p><a href="https://chatgpt.com/share/6aa9ec64-7708-83e8-8013-e977e4a72acb" target="_blank" rel="noopener noreferrer">回看最初的对话 ↗</a>　<a href="https://github.com/super-productivity/super-productivity" target="_blank" rel="noopener noreferrer">Super Productivity ↗</a></p></section></div>`; }
  function render() {
    const scroll = window.scrollY;
    const main = view==='goals'?goalsView():view==='history'?historyView():view==='about'?aboutView():closed?closedView():state.session?focusView():state.review?reviewView():setupView();
    $('#app').innerHTML = `<div class="shell"><aside class="sidebar"><div class="brand">${mark}<div>此刻<small>CIKE · MOMENT</small></div></div><div class="space-owner">${esc(state.owner)}的注意力空间</div><nav class="nav" aria-label="主导航">${[['now','sun','此刻'],['goals','direction','我的方向'],['history','steps','走过的小步'],['about','info','使用说明']].map(([v,ic,label])=>`<button class="${view===v?'active':''}" ${view===v?'aria-current="page"':''} data-action="nav" data-view="${v}">${icon(ic)}${label}</button>`).join('')}</nav><div class="side-bottom"><div class="side-note">不必追赶所有事情。<br>留一点空白，给自己。</div><div class="save-label ${storageError?'error':''}"><i></i>${storageError?'保存需要留意':'进度保存在这台设备'}</div></div></aside><main class="main"><div class="topbar"><span>${dateText()}</span><div class="right"><span>留一点空白，给自己</span><div class="avatar" aria-label="${esc(state.owner)}">${esc(state.owner.slice(0,1))}</div></div></div>${storageError?`<div class="storage-warning" role="alert">${esc(storageError)}</div>`:''}${main}<footer class="footnote">这一刻，我选择把注意力放在哪里。</footer></main></div>`;
    updateTimer(); window.scrollTo(0,scroll);
  }
  function saveRender() { persist(); render(); }
  function openModal(html) { const dialog=$('#modal'); dialog.innerHTML=`<button class="close-modal" aria-label="关闭" data-action="close-modal">×</button>${html}`;if(!dialog.open)dialog.showModal(); }
  function closeModal() { $('#modal').close(); }
  function goalModal(id) {
    const g=id?goal(id):null;
    openModal(`<h2 id="modal-title">${g?'调整这个方向':'写下一个方向'}</h2><p>不用一次想清楚，只写下你想靠近的事。</p><form id="modal-goal-form" data-id="${esc(id||'')}"><label class="field" for="modal-goal-title">我想做成什么</label><textarea id="modal-goal-title" name="title" maxlength="300" required placeholder="比如：做出自己的第一个小工具">${esc(g?.title||'')}</textarea><label class="field" for="modal-goal-why">为什么对我重要<small>选填</small></label><input type="text" id="modal-goal-why" name="why" maxlength="1000" value="${esc(g?.why||'')}" placeholder="写下心里的那个理由"><div class="actions"><button class="secondary" type="button" data-action="close-modal">暂时不改</button><button class="primary" type="submit">${g?'保存方向':'收好这个方向'}</button></div></form>`);
  }
  function editDraft() { const d=state.draft; if(!d)return;openModal(`<h2 id="modal-title">让这一步，更适合你。</h2><form id="draft-form"><label class="field" for="draft-title">具体做什么</label><textarea id="draft-title" name="title" required maxlength="1000">${esc(d.title)}</textarea><label class="field" for="draft-done">做到哪里，就可以停</label><textarea id="draft-done" name="done" required maxlength="1000">${esc(d.doneWhen)}</textarea><label class="field" for="draft-minutes">给自己多长时间<small>1～60 分钟，到点只是提醒</small></label><input class="minute-input" id="draft-minutes" type="number" name="minutes" min="1" max="60" step="1" value="${d.minutes}" required><div class="actions"><button class="secondary" type="button" data-action="close-modal">取消</button><button class="primary" type="submit">就这样，保存</button></div></form>`); }
  function restModal() { if(state.session?.kind==='rest'){view='now';render();return;}openModal(`<h2 id="modal-title">休息，不需要等到完成。</h2><p>选一种此刻舒服的方式，随时可以回来。${state.session?'当前行动会暂停并保留。':''}</p><div class="rest-options">${[['站起来，喝一点水',3],['看看远处，让眼睛歇歇',3],['走动一下，舒展身体',5],['什么也不做，放空一会儿',10]].map(([t,m])=>`<button class="rest-choice" data-action="start-rest" data-title="${esc(t)}" data-minutes="${m}"><strong>${t}</strong><span>${m} 分钟 ${m===10?'· 不需要有任何产出':''}</span></button>`).join('')}</div><form id="custom-rest-form"><label class="field" for="rest-minutes">或者，按自己的节奏</label><div class="inline-fields"><input id="rest-minutes" type="number" name="minutes" value="5" min="1" max="60" step="1" required aria-label="休息分钟数"><span style="font-size:12px;color:#91a07d">分钟</span><button class="secondary" type="submit">开始自由休息</button></div></form>`); }
  function smaller(d) { const level=Math.min(2,(d.level||0)+1);return {...d,id:C.uid(),level,minutes:level===1?5:2,title:level===1?`先给「${d.title}」留一个最粗糙的起点`:'只打开需要用到的东西，找到开始的位置',doneWhen:level===1?'只写一句话、画一笔或留下一个标记，不求完整。有一个起点就可以停。':`为「${goal(d.goalId)?.title||d.title}」准备一份材料或一个位置，找到第一个能动手的点。`}; }
  function chooseSuggestion(level=0) { const g=goal();if(!g){view='now';render();return;}state.draft=C.suggest(g,state.energy,g.nextIndex,level);closed=false;view='now';saveRender(); }
  function startRest(title,minutes) { C.beginRest(state,title,minutes);closeModal();view='now';closed=false;saveRender(); }
  function download(content,name,type='application/json') { const blob=new Blob([content],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
  function exportData(){download(JSON.stringify(state,null,2),`此刻-备份-${new Date().toLocaleDateString('sv-SE')}.json`);toast('备份已准备好，请保留下载的文件。');}
  function settleSuspended(){if(state.suspended){state.session=state.suspended;state.suspended=null;C.finish(state,'partial');}state.review=null;state.draft=null;}
  document.addEventListener('click', e => {
    const b=e.target.closest('[data-action]');if(!b||b.disabled)return;
    const a=b.dataset.action,id=b.dataset.id;
    if(a==='nav'){view=b.dataset.view;render();window.scrollTo(0,0);}
    else if(a==='close-modal')closeModal();
    else if(a==='energy'){
      // Keep any unsaved setup text while rerendering energy controls.
      const title=$('#goal-title')?.value,why=$('#goal-why')?.value;
      state.energy=b.dataset.value;if(state.draft?.template && !state.draft.level)state.draft.minutes=state.energy==='low'?5:10;const ev=state.history.find(e=>e.id===state.review?.eventId);if(ev)ev.energy=state.energy;
      saveRender();if(title!==undefined)$('#goal-title').value=title;if(why!==undefined)$('#goal-why').value=why;
    }
    else if(a==='suggest')chooseSuggestion();
    else if(a==='edit-draft')editDraft();
    else if(a==='smaller'&&state.draft){state.draft=smaller(state.draft);saveRender();}
    else if(a==='start-action'&&state.draft){state.session=C.makeSession(state.draft);C.start(state.session);state.draft=null;closed=false;saveRender();}
    else if(a==='toggle-timer'&&state.session){if(state.session.status==='running')C.pause(state.session);else C.start(state.session);saveRender();}
    else if(a==='extend'&&state.session?.status==='checkin'){C.extend(state.session);saveRender();}
    else if(a==='finish'&&state.session){C.finish(state,b.dataset.value);saveRender();}
    else if(a==='rest')restModal();
    else if(a==='start-rest')startRest(b.dataset.title,Number(b.dataset.minutes));
    else if(a==='resume-suspended'){C.resumeSuspended(state);view='now';saveRender();}
    else if(a==='next'){
      const r=state.review;if(!r)return;state.activeGoalId=r.goalId||state.activeGoalId;
      if(r.outcome==='stuck'){state.draft=smaller({title:r.title,doneWhen:'',goalId:r.goalId,minutes:5,level:r.level||0});state.review=null;saveRender();}
      else {state.review=null;chooseSuggestion();}
    }
    else if(a==='back-home'){state.review=null;closed=false;view='now';saveRender();}
    else if(a==='end-day'){settleSuspended();closed=true;saveRender();}
    else if(a==='new-goal')goalModal();
    else if(a==='edit-goal')goalModal(id);
    else if(a==='select-goal'){
      if(state.activeGoalId===id){view='now';closed=false;render();}
      else if(state.session||state.suspended||state.review)toast('先回到此刻，收好当前这一步，再切换方向。');
      else {state.activeGoalId=id;state.draft=null;chooseSuggestion();}
    }
    else if(a==='archive-goal'){
      if((state.session||state.review||state.suspended)&&id===state.activeGoalId){toast('先收好当前这一步，再把这个方向收起。');return;}
      goal(id).archived=true;if(state.activeGoalId===id){state.activeGoalId=null;state.draft=null;}saveRender();toast('方向已收起，随时可以重新展开。');
    }
    else if(a==='restore-goal'){goal(id).archived=false;saveRender();}
    else if(a==='toggle-archived'){showArchived=!showArchived;render();}
    else if(a==='export')exportData();
    else if(a==='import')$('#import-file').click();
    else if(a==='confirm-import'){
      const incoming=pendingImport;if(!incoming)return;
      // Merge records and goals; retain any work currently in progress.
      const goalIds=new Set(state.goals.map(g=>g.id)),histIds=new Set(state.history.map(h=>h.id));
      state.goals.push(...incoming.goals.filter(g=>!goalIds.has(g.id)));
      state.history.push(...incoming.history.filter(h=>!histIds.has(h.id)));state.history.sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
      if(!state.activeGoalId)state.activeGoalId=incoming.activeGoalId;
      if(!state.session&&!state.review&&!state.suspended){state.session=incoming.session;state.suspended=incoming.suspended;state.review=incoming.review;state.draft=incoming.draft;}
      if(incoming.scratch&&!state.scratch.includes(incoming.scratch))state.scratch=[state.scratch,incoming.scratch].filter(Boolean).join('\n\n');
      if(state.goals.length===incoming.goals.length)state.owner=incoming.owner;
      readError=false;pendingImport=null;closeModal();saveRender();toast('备份已合并，已有目标和记录都保留了。');
    }
    else if(a==='export-history'){
      const lines=['# 此刻 · 走过的小步',''];for(const h of state.history)lines.push(`## ${new Date(h.at).toLocaleString('zh-CN')} · ${outcomes[h.outcome]}`,h.title,`用时：${Math.floor(h.elapsedMs/60000)} 分钟；精力：${energyText[h.energy]||'未记录'}`,h.note||'','');download(lines.join('\n'),`此刻-小步记录-${new Date().toLocaleDateString('sv-SE')}.md`,'text/markdown;charset=utf-8');
    }
  });
  document.addEventListener('submit', e => {
    const f=e.target;e.preventDefault();const data=new FormData(f);
    if(f.id==='goal-form'||f.id==='modal-goal-form'){
      const title=String(data.get('title')||'').trim(),why=String(data.get('why')||'').trim();if(!title){toast('给这个方向写一个名字吧。');return;}
      const id=f.dataset.id;let g=id?goal(id):null;
      if(g){g.title=title;g.why=why;}
      else{g={id:C.uid(),title,why,nextIndex:0,createdAt:new Date().toISOString(),archived:false};state.goals.push(g);}
      closeModal();if(!state.session&&!state.review&&!state.suspended){state.activeGoalId=g.id;chooseSuggestion();}else{saveRender();toast('方向已保存，当前这一步继续保留。');}
    }
    else if(f.id==='draft-form'){
      const title=String(data.get('title')).trim(),done=String(data.get('done')).trim(),minutes=Number(data.get('minutes'));
      if(!title||!done||!Number.isInteger(minutes)||minutes<1||minutes>60){toast('请写好行动、结束点，以及 1～60 分钟的时长。');return;}
      Object.assign(state.draft,{title,doneWhen:done,minutes,template:false});closeModal();saveRender();
    }
    else if(f.id==='custom-rest-form'){const minutes=Number(data.get('minutes'));if(Number.isInteger(minutes)&&minutes>=1&&minutes<=60)startRest('按自己的节奏，休息一会儿',minutes);}
    else if(f.id==='owner-form'){const owner=String(data.get('owner')).trim();if(owner){state.owner=owner.slice(0,40);saveRender();toast('称呼已经保存。');}}
  });
  document.addEventListener('input',e=>{
    if(e.target.id==='scratch'){state.scratch=e.target.value;persist();}
    if(e.target.id==='review-note'){const ev=state.history.find(h=>h.id===state.review?.eventId);if(ev){ev.note=e.target.value;persist();}}
  });
  let pendingImport=null;
  $('#import-file').addEventListener('change',async e=>{
    const file=e.target.files[0];e.target.value='';if(!file)return;
    try{if(file.size>10000000)throw Error('size');const incoming=JSON.parse(await file.text());if(!C.validState(incoming))throw Error('format');pendingImport=incoming;openModal(`<h2 id="modal-title">把之前的小步带回来</h2><p>这份备份里有 ${incoming.goals.length} 个方向和 ${incoming.history.length} 条记录。导入会合并新记录，保留已有内容；同一条记录以当前浏览器中的版本为准。</p><p>当前有未结束的行动时，继续保留当前行动。</p><div class="actions"><button class="secondary" data-action="close-modal">取消</button><button class="primary" data-action="confirm-import">合并这份备份</button></div>`);}
    catch{toast('这份文件不是有效的此刻备份，当前进度没有改变。');}
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateTimer();});
  window.addEventListener('pagehide',persist);
  // Do not overwrite unrecognized data on startup.
  C.reconcile(state.session);render();setInterval(updateTimer,500);
})();
