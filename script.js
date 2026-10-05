(function () {
  'use strict';

  var SCAN_MS = 2400;
  var COUNT_MS = 1100;
  var DOT_COUNT = 36;
  var JITTER = 6;
  // < 1 让基准分偏正向：告白场景下均值落在 70 上下，低分稀有但不为零
  var CURVE = 0.4;

  var body = document.body;
  var form = document.querySelector('[data-form]');
  var inputMine = document.getElementById('codename');
  var inputPartner = document.getElementById('partner');
  var notice = document.querySelector('[data-notice]');
  var scoreEl = document.querySelector('[data-score]');
  var verdictEl = document.querySelector('[data-verdict]');
  var resetBtn = document.querySelector('[data-reset]');
  var dotLayer = document.querySelector('[data-particles]');

  var LINES = {
    high: [
      '频率对上了。这次，别装作没听见。',
      '数字是冷的，我算出来的这套，没那么冷。',
      '共振成立。剩下的，你自己看着办。'
    ],
    mid: [
      '不高，也不低。线还连着，别急着挂断。',
      '信号偏弱。再靠近一点，波形会变。',
      '介于可能和不确定之间。我懒得替你选。'
    ],
    low: [
      '别急着走。信号弱，不等于不存在。',
      '概率低，可你还没按下第二次。',
      '目前接不通。……我也没说让你放弃。'
    ]
  };

  var dots = [];
  var timers = [];
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function baseResonance(mine, partner) {
    var key = [mine, partner].sort().join('\u0000');
    var hash = 2166136261;
    for (var i = 0; i < key.length; i++) {
      hash ^= key.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    var unit = (hash >>> 0) / 4294967296;
    return Math.pow(unit, CURVE) * 100;
  }

  function resonanceOf(mine, partner) {
    var base = baseResonance(mine, partner);
    var jitter = (Math.random() * 2 - 1) * JITTER;
    var score = base + jitter;
    if (score < 0.5) {
      score = 0.5;
    }
    if (score > 99.9) {
      score = 99.9;
    }
    return Math.round(score * 100) / 100;
  }

  function clearTimers() {
    for (var i = 0; i < timers.length; i++) {
      clearTimeout(timers[i]);
    }
    timers = [];
  }

  function seedParticles() {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < DOT_COUNT; i++) {
      var dot = document.createElement('span');
      dot.className = 'particle';
      dots.push(dot);
      frag.appendChild(dot);
    }
    dotLayer.appendChild(frag);
    scatterParticles();
  }

  function scatterParticles() {
    for (var i = 0; i < dots.length; i++) {
      var angle = Math.random() * Math.PI * 2;
      var radius = 160 + Math.random() * 300;
      var dot = dots[i];
      dot.style.setProperty('--x', (Math.cos(angle) * radius).toFixed(1) + 'px');
      dot.style.setProperty('--y', (Math.sin(angle) * radius * 0.7).toFixed(1) + 'px');
      dot.style.setProperty('--delay', (Math.random() * 1.2).toFixed(2) + 's');
    }
  }

  function setState(state) {
    var map = {
      idle: 'panel--input',
      scan: 'panel--scan',
      done: 'panel--result'
    };
    body.dataset.state = state;

    var panels = document.querySelectorAll('.panel');
    for (var i = 0; i < panels.length; i++) {
      var panel = panels[i];
      var active = panel.classList.contains(map[state]);
      panel.setAttribute('aria-hidden', active ? 'false' : 'true');
    }
  }

  function runScore(target) {
    if (reduced || COUNT_MS <= 0) {
      scoreEl.textContent = target.toFixed(2);
      return;
    }

    var start = performance.now();

    function frame(now) {
      var t = Math.min(1, (now - start) / COUNT_MS);
      var eased = 1 - Math.pow(1 - t, 4);
      scoreEl.textContent = (target * eased).toFixed(2);
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        scoreEl.textContent = target.toFixed(2);
      }
    }

    requestAnimationFrame(frame);
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var mine = inputMine.value.trim();
    var partner = inputPartner.value.trim();

    if (!mine) {
      notice.textContent = '你的代号为空，信号无法识别。';
      notice.dataset.tone = 'alert';
      inputMine.focus();
      return;
    }

    if (!partner) {
      notice.textContent = '对方代号为空，信号无法识别。';
      notice.dataset.tone = 'alert';
      inputPartner.focus();
      return;
    }

    notice.textContent = '';
    notice.removeAttribute('data-tone');
    inputMine.blur();
    inputPartner.blur();

    clearTimers();
    scoreEl.textContent = '0.00';
    verdictEl.textContent = '';
    scatterParticles();
    setState('scan');

    var target = resonanceOf(mine, partner);

    timers.push(setTimeout(function () {
      var tone = target >= 80 ? 'high' : (target >= 40 ? 'mid' : 'low');
      verdictEl.textContent = pick(LINES[tone]);
      setState('done');
      runScore(target);
      resetBtn.focus({ preventScroll: true });
    }, reduced ? 400 : SCAN_MS));
  });

  resetBtn.addEventListener('click', function () {
    clearTimers();
    setState('idle');
    inputMine.value = '';
    inputPartner.value = '';
    scoreEl.textContent = '0.00';
    verdictEl.textContent = '';
    notice.textContent = '';
    notice.removeAttribute('data-tone');
    inputMine.focus();
  });

  seedParticles();
})();
