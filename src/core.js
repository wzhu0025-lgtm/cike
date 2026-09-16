(function (root) {
  'use strict';
  const uid = () => globalThis.crypto?.randomUUID?.() || `c${Date.now()}${Math.random().toString(36).slice(2)}`;
  const initial = () => ({ version: 1, owner: '朱薇', goals: [], activeGoalId: null, energy: 'steady', draft: null, session: null, suspended: null, review: null, history: [], scratch: '' });
  const recipes = [
    { key: /文章|写作|公众号|小红书|文案|报告|论文|日记|写/, steps: [
      ['写下想传达的 3 个要点', '每个要点只写一句话，先不润色。'],
      ['为其中 1 个要点补一个例子', '留下一段具体的例子或素材，几句话就够。'],
      ['把这个要点写成一小段', '写出一个可读的段落，允许它不完美。'],
      ['读一遍已有内容，只改一处', '修正一个不清楚的地方，再写下下次从哪里接着写。']
    ] },
    { key: /学习|学会|阅读|读书|课程|英语|考试|读完|看书/, steps: [
      ['选一小段内容，带着一个问题开始', '选好一页或一段课程，写下你想弄懂的 1 个问题。'],
      ['读或看这一小段，记下 3 个关键词', '只处理刚才选定的内容，留下 3 个关键词。'],
      ['用自己的话解释一个知识点', '不看原文，写出 2～3 句自己的理解。'],
      ['试做 1 道题，或举 1 个例子', '记录一次尝试，并标出一个还不清楚的地方。']
    ] },
    { key: /产品|工具|网站|网页|程序|代码|开发|应用|设计|方案|项目/, steps: [
      ['写下这个想法要解决的 3 个问题', '每个问题一句话，只写问题，不做排版。'],
      ['选最重要的 1 个问题，画出最短流程', '用 3 个步骤写清楚：从哪里开始、做什么、得到什么。'],
      ['给第一步做一个最粗糙的草稿', '留下一个草图、一段文字或一个能试的小片段。'],
      ['试一遍草稿，记下 1 个要改的地方', '记录一个具体问题，以及下次可以动手修改的位置。']
    ] },
    { key: /整理|收拾|清理|收纳|房间|文件|桌面|资料/, steps: [
      ['圈定一个小角落，只处理 5 件东西', '选一个抽屉、文件夹或桌面区域，先辨认 5 件物品。'],
      ['给这 5 件东西决定去处', '分成保留、待处理、可以移走；不确定的先留下。'],
      ['把需要保留的东西放回合适位置', '收好一小组即可，不扩大到其他区域。'],
      ['留一个方便下次开始的入口', '标记下次整理的一个小区域，然后停下来看看。']
    ] },
    { key: /运动|健身|散步|瑜伽|锻炼|跑步/, steps: [
      ['为一次轻松的活动准备好环境', '选好位置，放好水和需要的用品。'],
      ['按舒服的节奏活动一小会儿', '选一个熟悉且舒适的动作，感觉不适就停止。'],
      ['放慢下来，感受此刻的状态', '写下现在的身体感受，再决定今天是否到这里。']
    ] }
  ];
  function suggest(goal, energy = 'steady', index = 0, level = 0) {
    const title = goal.title.trim();
    const recipe = recipes.find(r => r.key.test(title));
    const generic = [
      ['写下这个目标完成时会是什么样', '写出一个具体结果，以及现在已经有的一个条件。'],
      ['找出离这个结果最近的一小步', '写清楚一个动作和它的结束点，只选你现在能动手的部分。'],
      ['动手做刚才选定的第一小段', '留下一个看得见的结果：一句话、一张草图或一次尝试。'],
      ['看一眼已有结果，选一个可调整的地方', '写下一个具体改动，作为下次的起点。']
    ];
    const steps = recipe?.steps || generic;
    const step = steps[Math.min(index, steps.length - 1)];
    let action = step[0], doneWhen = step[1], minutes = energy === 'low' ? 5 : 10;
    if (level === 1) { action = `先为「${step[0]}」留下一行草稿`; doneWhen = '只写一句话或留下一个标记。不完整也可以，到这里就能停。'; minutes = 5; }
    if (level >= 2) { action = '只打开需要用到的东西，找到开始的位置'; doneWhen = `为「${title}」打开一份文档、材料或准备一个位置，找到第一个可以动手的点。`; minutes = 2; }
    return { id: uid(), goalId: goal.id, title: action, doneWhen, minutes, level, template: true };
  }
  function elapsed(s, now = Date.now()) { return Math.max(0, s.elapsedMs + (s.status === 'running' ? Math.max(0, now - s.startedAt) : 0)); }
  function reconcile(s, now = Date.now()) {
    if (s?.status === 'running' && elapsed(s, now) >= s.plannedSeconds * 1000) {
      s.elapsedMs = s.plannedSeconds * 1000; s.startedAt = null; s.status = 'checkin';
      return true;
    }
    return false;
  }
  function pause(s, now = Date.now()) {
    if (s.status !== 'running') return;
    if (reconcile(s, now)) return;
    s.elapsedMs = elapsed(s, now); s.startedAt = null; s.status = 'paused';
  }
  function start(s, now = Date.now()) { if (s.status === 'ready' || s.status === 'paused') { s.status = 'running'; s.startedAt = now; } }
  function extend(s, minutes = 5, now = Date.now()) { s.plannedSeconds += minutes * 60; s.status = 'running'; s.startedAt = now; }
  function makeSession(draft, kind = 'action') {
    return { id: uid(), kind, goalId: draft.goalId || null, title: draft.title, doneWhen: draft.doneWhen, plannedSeconds: draft.minutes * 60, elapsedMs: 0, startedAt: null, status: 'ready', level: draft.level || 0 };
  }
  function finish(state, outcome, now = Date.now()) {
    const s = state.session;
    if (!s) return;
    reconcile(s, now);
    const event = { id: s.id, kind: s.kind, title: s.title, goalId: s.goalId, doneWhen: s.doneWhen, elapsedMs: elapsed(s, now), outcome, at: new Date(now).toISOString(), energy: state.energy, note: '' };
    state.history.unshift(event);
    if (s.kind === 'action' && outcome === 'complete') { const g = state.goals.find(g => g.id === s.goalId); if (g) g.nextIndex++; }
    state.review = { eventId: event.id, kind: s.kind, outcome, title: s.title, goalId: s.goalId, level: s.level };
    state.session = null; state.draft = null;
    return event;
  }
  function beginRest(state, title, minutes, now = Date.now()) {
    if (state.session?.kind === 'rest') return false;
    if (state.session) { pause(state.session, now); state.suspended = state.session; }
    state.review = null;
    state.session = makeSession({ title, doneWhen: '给自己一点空间。觉得休息够了，随时可以结束。', minutes }, 'rest');
    start(state.session, now); return true;
  }
  function resumeSuspended(state) {
    if (!state.suspended) return false;
    state.session = state.suspended; state.suspended = null; state.review = null;
    return true;
  }
  function validState(s) {
    const string = (v, max = 5000) => typeof v === 'string' && v.length <= max;
    const finite = v => Number.isFinite(v) && v >= 0;
    const sessionOK = x => x === null || (x && string(x.id, 100) && ['action','rest'].includes(x.kind) && string(x.title) && string(x.doneWhen) && finite(x.elapsedMs) && finite(x.plannedSeconds) && x.plannedSeconds > 0 && ['ready','running','paused','checkin'].includes(x.status) && (x.status !== 'running' || finite(x.startedAt)));
    return !!(s && s.version === 1 && string(s.owner, 40) && ['low','steady','high'].includes(s.energy) && string(s.scratch, 20000) && Array.isArray(s.goals) && s.goals.length <= 1000 && s.goals.every(g => g && string(g.id,100) && string(g.title,300) && string(g.why,1000) && Number.isInteger(g.nextIndex) && g.nextIndex >= 0) && Array.isArray(s.history) && s.history.length <= 20000 && s.history.every(e => e && string(e.id,100) && string(e.title) && ['action','rest'].includes(e.kind) && finite(e.elapsedMs) && ['complete','partial','stuck','ended','rested'].includes(e.outcome) && string(e.at,100) && !isNaN(Date.parse(e.at)) && string(e.note || '')) && sessionOK(s.session) && sessionOK(s.suspended) && (s.draft === null || (s.draft && string(s.draft.title) && string(s.draft.doneWhen) && Number.isInteger(s.draft.minutes) && s.draft.minutes >= 1 && s.draft.minutes <= 60)) && (s.review === null || (s.review && string(s.review.eventId,100) && string(s.review.title) && ['action','rest'].includes(s.review.kind))));
  }
  const api = { uid, initial, suggest, elapsed, reconcile, pause, start, extend, makeSession, finish, beginRest, resumeSuspended, validState };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CikeCore = api;
})(globalThis);
