import type { Project } from '@/types'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * 生成自包含的独立播放器 HTML：
 * 项目数据（含 base64 图片与音频）+ 播放运行时全部内嵌，无需任何外部文件，
 * 改名为 index.html 放到 GitHub Pages 等静态托管即可游玩。
 */
export function buildStandalonePlayerHTML(project: Project): string {
  const title = escapeHtml(project.title || '可视化小说')
  // 嵌入 <script> 需转义所有 "<"，防止 </script> 提前闭合
  const json = JSON.stringify(project).replace(/</g, '\\u003c')

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    background: #000; color: #f0f0f0; overflow: hidden;
    font-family: system-ui, -apple-system, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  #stage { position: fixed; inset: 0; overflow: hidden; user-select: none; cursor: pointer; }
  #world { position: absolute; inset: 0; }
  #bg { position: absolute; inset: 0; transition: opacity .4s; }
  #shade { position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(to top, rgba(0,0,0,.55), transparent 40%, transparent 75%, rgba(0,0,0,.25)); }
  .sprite { position: absolute; bottom: 0; height: 88%; width: max-content; display: flex; align-items: flex-end; justify-content: center; transform: translateX(-50%); }
  .pos-far-left { left: 7%; } .pos-left { left: 22%; } .pos-center { left: 50%; } .pos-right { left: 78%; } .pos-far-right { left: 93%; }
  .sprite-inner { display: flex; align-items: flex-end; height: 100%; }
  .sprite img, .sprite svg { height: 100%; max-width: none; transition: filter .3s; }
  .dim img, .dim svg { filter: brightness(.55); }
  #flash { position: absolute; inset: 0; pointer-events: none; opacity: 0;
    background: radial-gradient(circle at 50% 55%, #fff7e0 0%, #ffb84c 45%, transparent 75%); }

  /* ---- 演出效果 ---- */
  @keyframes vn-shake {
    0%,100% { transform: translate(0,0); } 8% { transform: translate(-14px,8px); }
    16% { transform: translate(12px,-10px); } 26% { transform: translate(-10px,-6px); }
    36% { transform: translate(9px,7px); } 48% { transform: translate(-7px,4px); }
    60% { transform: translate(5px,-4px); } 74% { transform: translate(-3px,2px); }
    88% { transform: translate(2px,-1px); }
  }
  .vn-shake { animation: vn-shake .6s linear both; }
  .vn-shake-impact { animation: vn-shake .5s linear both; animation-delay: .38s; }
  @keyframes vn-shake-hard {
    0%,100% { transform: translate(0,0) rotate(0deg); }
    6% { transform: translate(-26px,14px) rotate(-1.6deg); }
    14% { transform: translate(24px,-18px) rotate(1.4deg); }
    24% { transform: translate(-22px,10px) rotate(-1.2deg); }
    34% { transform: translate(20px,14px) rotate(1deg); }
    46% { transform: translate(-16px,-12px) rotate(-.8deg); }
    58% { transform: translate(14px,8px) rotate(.6deg); }
    70% { transform: translate(-10px,-6px) rotate(-.4deg); }
    82% { transform: translate(6px,4px) rotate(.2deg); }
    92% { transform: translate(-3px,-2px) rotate(-.1deg); }
  }
  .vn-shake-hard { animation: vn-shake-hard 1.15s linear both; }
  @keyframes vn-flash { 0% { opacity: 0; } 7% { opacity: .85; } 100% { opacity: 0; } }
  .vn-flash { animation: vn-flash .7s ease-out both; }
  @keyframes vn-flash-hard { 0% { opacity: 0; } 5% { opacity: .95; } 22% { opacity: .15; } 38% { opacity: .7; } 100% { opacity: 0; } }
  .vn-flash-hard { animation: vn-flash-hard 1s ease-out both; }
  .vn-flash-impact { animation: vn-flash .75s ease-out both; animation-delay: .36s; }
  @keyframes lunge-r-far { 0%{transform:translateX(0)} 42%{transform:translateX(24vw)} 54%{transform:translateX(21vw)} 100%{transform:translateX(0)} }
  @keyframes lunge-l-far { 0%{transform:translateX(0)} 42%{transform:translateX(-24vw)} 54%{transform:translateX(-21vw)} 100%{transform:translateX(0)} }
  @keyframes lunge-r-near { 0%{transform:translateX(0)} 42%{transform:translateX(13vw)} 54%{transform:translateX(11vw)} 100%{transform:translateX(0)} }
  @keyframes lunge-l-near { 0%{transform:translateX(0)} 42%{transform:translateX(-13vw)} 54%{transform:translateX(-11vw)} 100%{transform:translateX(0)} }
  .lunge-r-far { animation: lunge-r-far 1.1s cubic-bezier(.3,0,.4,1) both; }
  .lunge-l-far { animation: lunge-l-far 1.1s cubic-bezier(.3,0,.4,1) both; }
  .lunge-r-near { animation: lunge-r-near 1.1s cubic-bezier(.3,0,.4,1) both; }
  .lunge-l-near { animation: lunge-l-near 1.1s cubic-bezier(.3,0,.4,1) both; }
  @keyframes vn-fadeout { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(14px); } }
  .vn-fadeout { animation: vn-fadeout .4s ease-in both; }
  @keyframes vn-fadein { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  .vn-fadein { animation: vn-fadein .45s ease-out both; }
  @keyframes vn-move { from { transform: translateX(var(--dx, 0)); } to { transform: translateX(0); } }
  .vn-move { animation: vn-move .6s cubic-bezier(.25,.1,.25,1) both; }
  @keyframes bg-fade { from { opacity: 0; } to { opacity: 1; } }
  .bg-fade { animation: bg-fade .5s ease-out both; }

  #topbar { position: absolute; top: 0; left: 0; right: 0; display: flex; justify-content: space-between;
    align-items: center; padding: 14px; pointer-events: none; }
  #topbar span {
    font-family: 'Space Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: .18em;
    background: rgba(0,0,0,.45); color: rgba(255,255,255,.7); padding: 6px 16px; border-radius: 9999px;
    backdrop-filter: blur(4px);
  }
  #mutebtn {
    pointer-events: auto; cursor: pointer; border: 1px solid rgba(255,255,255,.2); border-radius: 9999px;
    background: rgba(0,0,0,.45); color: rgba(255,255,255,.75); padding: 6px 14px; font-size: 12px;
    font-family: 'Space Mono', ui-monospace, monospace; letter-spacing: .1em; backdrop-filter: blur(4px);
  }
  #mutebtn:hover { background: rgba(255,255,255,.1); }

  #dialog { position: absolute; left: 0; right: 0; bottom: 0; padding: 0 16px 20px; display: none; }
  #dialog-inner { max-width: 768px; margin: 0 auto; position: relative; }
  #nameplate {
    display: none; position: relative; z-index: 2; margin: 0 0 -16px 20px; padding: 8px 20px;
    border-radius: 9999px; font-size: 14px; font-weight: 700; color: #1b1b1b; width: fit-content;
    box-shadow: 0 4px 14px rgba(0,0,0,.4);
  }
  #box {
    min-height: 112px; background: rgba(20,20,20,.95); border: 1px solid rgba(255,255,255,.15);
    border-radius: 16px; padding: 24px 28px 20px; backdrop-filter: blur(8px);
    box-shadow: 0 12px 40px rgba(0,0,0,.5); position: relative;
  }
  #dtext {
    font-family: 'Noto Serif SC', 'Songti SC', SimSun, serif;
    font-size: 17px; line-height: 2; color: #f0f0f0; white-space: pre-wrap;
  }
  @media (min-width: 640px) { #dtext { font-size: 19px; } }
  .caret::after { content: '▍'; color: #d1d0ea; animation: blink .9s steps(1) infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  #hint { position: absolute; right: 20px; bottom: 10px; font-size: 12px; color: #d1d0ea; display: none;
    animation: bob 1.2s ease-in-out infinite; }
  @keyframes bob { 0%,100% { transform: translateY(0); opacity: .9; } 50% { transform: translateY(3px); opacity: .4; } }
  .fade-in { animation: stagein .45s ease-out both; }
  @keyframes stagein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

  #choices { margin-top: 14px; display: none; flex-direction: column; gap: 8px; }
  .choice-btn {
    display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; cursor: pointer;
    background: transparent; border: 1px solid rgba(255,255,255,.15); border-radius: 12px;
    padding: 12px 20px; color: #f0f0f0; transition: all .15s;
    font-family: 'Noto Serif SC', 'Songti SC', SimSun, serif; font-size: 16px;
  }
  .choice-btn:hover { border-color: rgba(209,208,234,.7); background: rgba(68,35,105,.4); }
  .choice-btn .key { font-family: 'Space Mono', ui-monospace, monospace; font-size: 12px; color: #d1d0ea; }
  .choice-btn .arrow { margin-left: auto; color: rgba(255,255,255,.25); transition: transform .15s; }
  .choice-btn:hover .arrow { transform: translateX(4px); }

  .overlay {
    position: absolute; inset: 0; display: none; flex-direction: column; align-items: center;
    justify-content: center; gap: 24px; background: rgba(0,0,0,.72); backdrop-filter: blur(6px); z-index: 10;
  }
  .mono-tag {
    font-family: 'Space Mono', ui-monospace, monospace; font-size: 12px; letter-spacing: .3em;
    color: rgba(240,240,240,.7); display: flex; align-items: center; gap: 10px;
  }
  .mono-tag::before { content: ''; width: 8px; height: 8px; background: #d1d0ea; }
  .overlay h1 { font-family: 'Noto Serif SC', 'Songti SC', SimSun, serif; font-size: 40px; font-weight: 700; letter-spacing: .08em; }
  .overlay h2 { font-family: 'Noto Serif SC', 'Songti SC', SimSun, serif; font-size: 24px; font-weight: 600; }
  .big-btn {
    cursor: pointer; border: none; border-radius: 9999px; padding: 12px 36px; font-size: 16px; font-weight: 600;
    background: #d1d0ea; color: #1b1b1b; transition: background .15s;
  }
  .big-btn:hover { background: #e4e3f6; }
  #credit { position: absolute; bottom: 18px; font-family: 'Space Mono', ui-monospace, monospace;
    font-size: 10px; letter-spacing: .2em; color: rgba(255,255,255,.3); }
</style>
</head>
<body>
<div id="stage">
  <div id="world">
    <div id="bg"></div>
    <div id="shade"></div>
    <div id="sprites"></div>
  </div>
  <div id="flash"></div>
  <div id="topbar">
    <span id="toptext"></span>
    <button id="mutebtn">MUSIC ON</button>
  </div>

  <div id="dialog">
    <div id="dialog-inner">
      <div id="nameplate"></div>
      <div id="box">
        <p id="dtext"></p>
        <div id="choices"></div>
        <span id="hint">▼ 点击继续</span>
      </div>
    </div>
  </div>

  <div id="end" class="overlay">
    <span class="mono-tag">幕 终</span>
    <h2 id="endtitle"></h2>
    <button class="big-btn" id="replaybtn">再玩一次</button>
    <span id="credit">MADE WITH 照影工坊</span>
  </div>

  <div id="start" class="overlay" style="display:flex">
    <span class="mono-tag">VISUAL NOVEL</span>
    <h1>${title}</h1>
    <button class="big-btn" id="startbtn">开始阅读</button>
    <span id="credit2" style="position:absolute;bottom:18px;font-family:'Space Mono',ui-monospace,monospace;font-size:10px;letter-spacing:.2em;color:rgba(255,255,255,.3)">点击 / 空格 推进剧情</span>
  </div>
</div>

<script type="application/json" id="vn-data">${json}</script>
<script>
(function () {
  var P = JSON.parse(document.getElementById('vn-data').textContent);
  var sceneId = null, beatIndex = 0, charCount = 0, ended = false, started = false, effectRunning = false;
  var audio = new Audio(), muted = false;
  P.bgms = P.bgms || [];

  function el(id) { return document.getElementById(id); }
  function findById(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function scene() { return findById(P.scenes, sceneId); }
  function beat() { var s = scene(); if (!s || ended) return null; return s.beats[beatIndex] || null; }
  function fullText(b) { return b.kind === 'dialogue' ? b.text : (b.kind === 'choice' ? b.prompt : ''); }
  // 当前 BGM：幕起始 BGM + 扫描音乐切换卡，最后一张生效
  function currentBgmId() {
    var s = scene(); if (!s) return null;
    var id = s.bgmId || null;
    for (var i = 0; i <= beatIndex && i < s.beats.length; i++) {
      var b = s.beats[i];
      if (b.kind === 'bgm') id = b.bgmId;
    }
    return id;
  }
  // 当前背景：幕起始背景 + 扫描背景切换卡，最后一张生效
  function currentBackgroundId() {
    var s = scene(); if (!s) return null;
    var id = s.backgroundId || null;
    for (var i = 0; i <= beatIndex && i < s.beats.length; i++) {
      var b = s.beats[i];
      if (b.kind === 'bg') id = b.backgroundId;
    }
    return id;
  }
  var POS_ORDER = ['far-left', 'left', 'center', 'right', 'far-right'];
  var POS_LEFT = { 'far-left': 7, 'left': 22, 'center': 50, 'right': 78, 'far-right': 93 };
  function posOrd(pos) { var i = POS_ORDER.indexOf(pos); return i < 0 ? 2 : i; }
  function lungeClass(pos, other) {
    var diff = posOrd(other) - posOrd(pos);
    return 'lunge-' + (diff > 0 ? 'r' : 'l') + '-' + (Math.abs(diff) >= 2 ? 'far' : 'near');
  }

  function bgCss(bg) {
    if (!bg) return 'linear-gradient(180deg,#1b1b1b,#0d0d0d)';
    if (bg.kind === 'image' && bg.image) return 'url("' + bg.image + '") center / cover no-repeat';
    return bg.gradient || '#1b1b1b';
  }

  function silhouette(ch, sp) {
    var gid = 'g' + ch.id;
    var label = sp ? sp.name : '未上传立绘';
    return '<svg viewBox="0 0 200 320">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + ch.color + '" stop-opacity="0.95"/>' +
      '<stop offset="100%" stop-color="' + ch.color + '" stop-opacity="0.35"/></linearGradient></defs>' +
      '<ellipse cx="100" cy="316" rx="72" ry="8" fill="#000" opacity="0.35"/>' +
      '<path d="M100 28c-26 0-42 20-42 46 0 17 7 31 17 38-3 8-9 13-19 18-24 12-38 32-40 62l-3 106c0 8 6 14 14 14h146c8 0 14-6 14-14l-3-106c-2-30-16-50-40-62-10-5-16-10-19-18 10-7 17-21 17-38 0-26-16-46-42-46z" fill="url(#' + gid + ')"/>' +
      '<text x="100" y="240" text-anchor="middle" font-size="44" font-weight="700" fill="#1b1b1b" opacity="0.75" font-family="system-ui,sans-serif">' + ch.name.charAt(0) + '</text>' +
      '<text x="100" y="266" text-anchor="middle" font-size="13" fill="#1b1b1b" opacity="0.55" font-family="monospace">' + label + '</text>' +
      '</svg>';
  }

  function renderSprites(clash, scanUpto, fadeTarget, fadeTargets, entering) {
    var s = scene(); if (!s) return;
    if (scanUpto === undefined) scanUpto = beatIndex;
    var map = {};
    for (var i = 0; i <= scanUpto && i < s.beats.length; i++) {
      var b = s.beats[i];
      if (b.kind === 'effect' && b.effect === 'clear') {
        if (b.target === 'all') map = {};
        else if (b.targets && b.targets.length) {
          for (var t = 0; t < b.targets.length; t++) delete map[b.targets[t]];
        } else if (b.target) delete map[b.target];
        continue;
      }
      if (b.kind === 'enter') {
        for (var n = 0; n < b.entries.length; n++) {
          var e = b.entries[n];
          if (!e.characterId) continue;
          var ech = findById(P.characters, e.characterId); if (!ech) continue;
          var esp = findById(ech.sprites, e.spriteId) || ech.sprites[0] || null;
          map[e.position] = { ch: ech, sp: esp, dim: i !== beatIndex };
        }
        continue;
      }
      if (b.kind === 'move') {
        // 原子走位：先取出所有要移动的立绘，清空原站位后统一放到新站位
        var moved = [];
        for (var mi = 0; mi < b.moves.length; mi++) {
          var mv = b.moves[mi];
          if (map[mv.from]) moved.push({ from: mv.from, to: mv.to, it: map[mv.from] });
        }
        for (var mi2 = 0; mi2 < b.moves.length; mi2++) delete map[b.moves[mi2].from];
        for (var mi3 = 0; mi3 < moved.length; mi3++) {
          var m = moved[mi3];
          map[m.to] = { ch: m.it.ch, sp: m.it.sp, dim: i !== beatIndex, slideFrom: i === beatIndex ? m.from : undefined };
        }
        continue;
      }
      if (b.kind !== 'dialogue' || !b.characterId || b.showSprite === false) continue;
      var ch = findById(P.characters, b.characterId); if (!ch) continue;
      var sp = findById(ch.sprites, b.spriteId) || ch.sprites[0] || null;
      map[b.position] = { ch: ch, sp: sp, dim: i !== beatIndex };
    }
    var count = 0;
    for (var key in map) if (map[key]) count++;
    var spriteHeight = count > 3 ? '74%' : '88%';
    var html = '';
    for (var k = 0; k < POS_ORDER.length; k++) {
      var pos = POS_ORDER[k], it = map[pos]; if (!it) continue;
      var inner = it.sp && it.sp.image ? '<img src="' + it.sp.image + '" alt="">' : silhouette(it.ch, it.sp);
      var lunge = '';
      if (clash && (pos === clash.from || pos === clash.to)) {
        lunge = ' ' + lungeClass(pos, pos === clash.from ? clash.to : clash.from);
      }
      var fade = (fadeTarget === 'all' || fadeTarget === pos || (fadeTargets && fadeTargets.indexOf(pos) >= 0)) ? ' vn-fadeout' : '';
      var fin = (entering && entering.indexOf(pos) >= 0) ? ' vn-fadein' : '';
      var mvCls = '', mvStyle = '';
      if (it.slideFrom) {
        mvCls = ' vn-move';
        mvStyle = ' style="--dx:' + ((POS_LEFT[it.slideFrom] || 50) - (POS_LEFT[pos] || 50)) + 'vw"';
      }
      html += '<div class="sprite pos-' + pos + (it.dim ? ' dim' : '') + '" style="height:' + spriteHeight + '">' +
        '<div class="sprite-inner' + lunge + fade + fin + mvCls + '"' + mvStyle + '>' + inner + '</div></div>';
    }
    el('sprites').innerHTML = html;
  }

  function syncBgm() {
    var bgm = findById(P.bgms, currentBgmId());
    var src = bgm ? bgm.audio : '';
    if (audio.getAttribute('data-src') !== src) {
      audio.pause();
      if (src) {
        audio.src = src;
        audio.setAttribute('data-src', src);
        audio.loop = true;
        audio.volume = 0.55;
        audio.muted = muted;
        audio.play().catch(function () {});
      } else {
        audio.removeAttribute('src');
        audio.removeAttribute('data-src');
      }
    }
  }

  var dialogBeatId = null; // 当前已做淡入的台词卡 id，避免打字完成时重播动画
  function renderDialog() {
    var b = beat();
    var dlg = el('dialog');
    if (!b || b.kind === 'effect' || b.kind === 'bgm' || b.kind === 'bg' || b.kind === 'enter' || b.kind === 'move') { dlg.style.display = 'none'; dialogBeatId = null; return; }
    dlg.style.display = 'block';
    if (b.id !== dialogBeatId) {
      dialogBeatId = b.id;
      dlg.className = '';
      void dlg.offsetWidth; // 重启动画
      dlg.className = 'fade-in';
    }

    var speaker = b.kind === 'dialogue' && b.characterId ? findById(P.characters, b.characterId) : null;
    var np = el('nameplate');
    if (speaker) { np.style.display = 'block'; np.textContent = speaker.name; np.style.background = speaker.color; }
    else np.style.display = 'none';

    var full = fullText(b);
    var typing = charCount < full.length;
    var dt = el('dtext');
    dt.textContent = full.slice(0, charCount);
    dt.className = typing ? 'caret' : '';
    el('hint').style.display = (!typing && b.kind === 'dialogue') ? 'inline' : 'none';

    var ch = el('choices');
    if (b.kind === 'choice' && !typing) {
      var html = '';
      for (var i = 0; i < b.options.length; i++) {
        html += '<button class="choice-btn" data-i="' + i + '">' +
          '<span class="key">' + String.fromCharCode(65 + i) + '</span>' +
          '<span></span><span class="arrow">→</span></button>';
      }
      ch.innerHTML = html;
      var btns = ch.querySelectorAll('.choice-btn');
      for (var j = 0; j < btns.length; j++) {
        (function (btn) {
          var opt = b.options[parseInt(btn.getAttribute('data-i'), 10)];
          btn.children[1].textContent = opt.text;
          btn.onclick = function (e) { e.stopPropagation(); choose(opt.targetSceneId); };
        })(btns[j]);
      }
      ch.style.display = 'flex';
    } else {
      ch.style.display = 'none';
      ch.innerHTML = '';
    }
  }

  var lastBgId = '__init__';
  function render() {
    var s = scene(); if (!s) return;
    var bgId = currentBackgroundId();
    el('bg').style.background = bgCss(findById(P.backgrounds, bgId));
    if (bgId !== lastBgId) {
      lastBgId = bgId;
      var bgEl = el('bg');
      bgEl.classList.remove('bg-fade');
      void bgEl.offsetWidth; // 重启淡入动画
      bgEl.classList.add('bg-fade');
    }
    el('toptext').textContent = P.title + ' · ' + s.title;
    syncBgm();
    var b = beat();
    if (b && (b.kind === 'effect' || b.kind === 'bgm' || b.kind === 'bg' || b.kind === 'enter' || b.kind === 'move')) { runEffect(b); return; }
    renderSprites(null);
    renderDialog();
  }

  function runEffect(b) {
    effectRunning = true;
    el('dialog').style.display = 'none';
    var world = el('world'), flash = el('flash');
    if (b.kind === 'bgm' || b.kind === 'bg') {
      // 音乐/背景切换卡：切换已在 render 中执行，短暂停留后推进
      renderSprites(null);
      setTimeout(function () {
        effectRunning = false;
        nextAfterEffect();
      }, b.kind === 'bgm' ? 150 : 450);
      return;
    }
    if (b.kind === 'enter') {
      // 多人上场卡：让所有上场角色同时淡入
      var enterPos = [];
      for (var ei = 0; ei < b.entries.length; ei++) {
        if (b.entries[ei].characterId) enterPos.push(b.entries[ei].position);
      }
      renderSprites(null, undefined, null, null, enterPos);
      setTimeout(function () {
        effectRunning = false;
        nextAfterEffect();
      }, 600);
      return;
    }
    if (b.kind === 'move') {
      // 走位卡：扫描时自动为被移动立绘带上 vn-move 滑动动画
      renderSprites(null);
      setTimeout(function () {
        effectRunning = false;
        nextAfterEffect();
      }, 700);
      return;
    }
    if (b.effect === 'shake' || b.effect === 'shake-hard') {
      var hard = b.effect === 'shake-hard';
      renderSprites(null);
      world.className = hard ? 'vn-shake-hard' : 'vn-shake';
      flash.className = hard ? 'vn-flash-hard' : 'vn-flash';
      setTimeout(function () {
        world.className = ''; flash.className = '';
        effectRunning = false;
        nextAfterEffect();
      }, hard ? 1300 : 750);
    } else if (b.effect === 'clear') {
      // 渲染下场前的舞台状态，让离场角色淡出
      renderSprites(null, beatIndex - 1, b.target || (b.targets && b.targets.length ? null : 'all'), b.targets || null);
      setTimeout(function () {
        effectRunning = false;
        nextAfterEffect();
      }, 500);
    } else {
      renderSprites({ from: b.from || 'left', to: b.to || 'right' });
      flash.className = 'vn-flash-impact';
      world.className = 'vn-shake-impact';
      setTimeout(function () {
        world.className = ''; flash.className = '';
        effectRunning = false;
        nextAfterEffect();
      }, 1250);
    }
  }

  function nextAfterEffect() {
    var s = scene(); if (!s) return;
    if (beatIndex + 1 < s.beats.length) { beatIndex++; charCount = 0; render(); }
    else endScene();
  }

  function endScene() {
    ended = true;
    el('dialog').style.display = 'none';
    el('endtitle').textContent = (scene() ? scene().title : '') + ' · 完';
    el('end').style.display = 'flex';
  }

  function advance() {
    if (!started || ended || effectRunning) return;
    var s = scene(); if (!s) return;
    var b = beat();
    if (!b) { endScene(); return; }
    if (b.kind === 'effect' || b.kind === 'bgm' || b.kind === 'bg' || b.kind === 'enter' || b.kind === 'move') return;
    var full = fullText(b);
    if (charCount < full.length) { charCount = full.length; renderDialog(); return; }
    if (b.kind === 'choice') return;
    if (beatIndex + 1 < s.beats.length) { beatIndex++; charCount = 0; render(); }
    else endScene();
  }

  function choose(target) {
    if (!target) { endScene(); return; }
    sceneId = target; beatIndex = 0; charCount = 0; ended = false;
    render();
  }

  function start() {
    started = true; ended = false; beatIndex = 0; charCount = 0; dialogBeatId = null;
    sceneId = P.scenes.length ? P.scenes[0].id : null;
    el('start').style.display = 'none';
    el('end').style.display = 'none';
    if (!sceneId) { el('endtitle').textContent = '这部作品还没有剧情'; endScene(); return; }
    render();
  }

  // 打字机
  setInterval(function () {
    if (!started || ended || effectRunning) return;
    var b = beat(); if (!b) return;
    var full = fullText(b);
    if (charCount < full.length) {
      charCount++;
      var dt = el('dtext');
      dt.textContent = full.slice(0, charCount);
      if (charCount >= full.length) { dt.className = ''; renderDialog(); }
    }
  }, 32);

  el('stage').addEventListener('click', function (e) {
    if (e.target.closest('button')) return;
    advance();
  });
  el('startbtn').addEventListener('click', function (e) { e.stopPropagation(); start(); });
  el('replaybtn').addEventListener('click', function (e) { e.stopPropagation(); start(); });
  el('mutebtn').addEventListener('click', function (e) {
    e.stopPropagation();
    muted = !muted;
    audio.muted = muted;
    el('mutebtn').textContent = muted ? 'MUSIC OFF' : 'MUSIC ON';
  });
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (!started) start(); else advance();
    }
  });
})();
</script>
</body>
</html>
`
}

export function downloadStandalonePlayer(project: Project) {
  const html = buildStandalonePlayerHTML(project)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${project.title || 'visual-novel'}.html`
  a.click()
  URL.revokeObjectURL(a.href)
}
