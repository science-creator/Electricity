/* =========================================================
   lab.js — 실험실 화면 (그리기 · 계기판 · 조작 · 미션)
   ---------------------------------------------------------
   계산은 power.js 가 하고, 이 파일은 그것을 '보이게' 만든다.
   (앞선 네 앱의 lab.js 와 같은 구조 · 같은 규칙)

   화면의 핵심 장치 세 가지
     ① **1초마다 에너지 덩어리가 쌓이는 것**을 눈금으로 보여 준다.
        "40W = 1초에 40J" 을 글로 외우지 않고 쌓이는 양으로 보게 하려는 것이다.
     ② 정격 전압 장면은 **전압 막대와 전력 막대를 나란히** 둔다.
        전압을 절반으로 내리면 전력은 4분의 1이 되는 것이 두 막대의 길이 차이로 드러난다.
     ③ 우리 집 장면은 선생님 학습지의 표를 **가로 막대**로 세운다.
        소비 전력이 큰 것과 전력량이 큰 것이 **다르다**는 것이 이 장면의 결론이다
        (다리미는 세지만 30분만 쓰고, 선풍기는 약하지만 10시간 쓴다).

   ⚠ 캔버스 크기는 CSS 가 정한다. 애니메이션이 없어 rAF 를 돌리지 않는다.
   ========================================================= */
(function () {
  "use strict";

  var W = window.Power;

  var S = {
    scene: "watt",
    devName: "선풍기",
    sec: 1,
    volt: 220,
    homeName: "전등",
    hours: 6,
    mission: null, predictPick: null, missionState: "ready"
  };

  /* 우리 집 표는 학생이 시간을 바꿀 수 있어야 하므로 복사해서 들고 있는다 */
  var home = W.HOME.map(function (h) { return { name: h.name, icon: h.icon, w: h.w, hours: h.hours, convert: h.convert }; });

  var canvas, ctx, cssW = 900, cssH = 556;
  var records = [];
  var seen = { j44: false, j10750: false, sec20: false, volt110: false, biggest: false, dryer: false };

  function $(id) { return document.getElementById(id); }
  function clamp(v, a, b) { return W.clamp(v, a, b); }
  function dev() { return W.byName(W.APPLIANCES, S.devName) || W.APPLIANCES[3]; }
  function homeDev() { return W.byName(home, S.homeName) || home[0]; }

  /* ---------------------------------------------------------
     1. 미션
     --------------------------------------------------------- */
  var MISSIONS = [
    {
      id: 1, star: "💡", title: "44 W 는 무슨 뜻일까",
      story: "<b>선풍기</b>의 소비 전력은 <b>44 W</b> 다. 이 선풍기가 <b>1초 동안</b> 쓰는 " +
             "전기 에너지는 몇 J 일까? 직접 맞춰 보자.",
      /* ⚠ 시작값을 정답 자리에 두면 미션이 시작하자마자 깨진다. 일부러 다른 값에서 시작한다 */
      scene: "watt", setup: { devName: "선풍기", sec: 30 }, allow: ["dev", "sec"],
      predict: { q: "44 W 인 선풍기가 1초 동안 쓰는 전기 에너지는?",
                 opts: ["<b>44 J</b>", "440 J", "4.4 J"], ans: 0 },
      goals: [{ key: "j44", text: "선풍기를 <b>1초</b>에 맞춰 <b>44 J</b> 확인하기" }],
      why: "<b>44 J</b> 입니다. <b>W(와트)</b>는 <b>1초 동안</b> 쓰는 전기 에너지의 양이에요.<br>" +
           "그러니 <b>44 W = 1초에 44 J</b> 입니다. 이 한 문장이면 이 단원의 계산은 다 풀립니다.<br>" +
           "<em>선생님 학습지의 문장 그대로예요 — “40W 는 1초 동안 40J 의 전기에너지를 소모한다는 의미”.</em>"
    },
    {
      id: 2, star: "⏱️", title: "10초 동안이라면",
      story: "<b>전기다리미</b>의 소비 전력은 <b>1075 W</b> 다. <b>10초 동안</b> 쓰는 " +
             "전기 에너지는 몇 J 일까?",
      scene: "watt", setup: { devName: "전기다리미", sec: 1 }, allow: ["dev", "sec"],
      predict: { q: "1075 W 인 전기다리미가 10초 동안 쓰는 전기 에너지는?",
                 opts: ["1075 J", "<b>10750 J</b>", "107.5 J"], ans: 1 },
      goals: [{ key: "j10750", text: "전기다리미를 <b>10초</b>에 맞춰 확인하기" }],
      why: "<b>10750 J</b> 입니다. 전기 에너지 = 소비 전력 × 시간 = 1075 × 10 = 10750 J.<br>" +
           "1초에 1075 J 씩 쓰니까 10초면 그 열 배죠. " +
           "<b>전기다리미 10초</b>가 <b>선풍기 4분</b>보다 많은 에너지를 쓴다는 뜻이기도 합니다."
    },
    {
      id: 3, star: "🔍", title: "거꾸로 물으면",
      story: "<b>스탠드</b>(7 W)가 <b>140 J</b> 의 전기 에너지를 썼다. " +
             "<b>몇 초 동안</b> 켜 두었을까? 시간을 밀어 맞춰 보자.",
      scene: "watt", setup: { devName: "스탠드", sec: 1 }, allow: ["dev", "sec"],
      predict: { q: "7 W 인 스탠드가 140 J 을 쓰려면?", opts: ["<b>20초</b>", "140초", "7초"], ans: 0 },
      goals: [{ key: "sec20", text: "스탠드를 <b>20초</b>에 맞춰 <b>140 J</b> 만들기" }],
      why: "<b>20초</b> 입니다. 시간 = 전기 에너지 ÷ 소비 전력 = 140 ÷ 7 = 20초.<br>" +
           "곱셈을 거꾸로 한 것뿐이에요. <b>E = P × t</b> 에서 무엇을 묻든 나머지 둘로 구할 수 있습니다."
    },
    {
      id: 4, star: "🔌", title: "110 V 에 꽂으면",
      story: "<b>전열기</b>는 <b>220 V</b> 에서 <b>1200 W</b> 인 기구다. " +
             "이것을 <b>110 V</b> 콘센트에 꽂아도 1초에 1200 J 을 쓸 수 있을까?",
      scene: "volt", setup: { devName: "전열기", volt: 220 }, allow: ["dev", "volt"],
      predict: { q: "220 V 용 기구를 110 V 에 꽂으면 소비 전력은?",
                 opts: ["그대로 1200 W", "절반인 600 W", "<b>4분의 1인 300 W</b>"], ans: 2 },
      goals: [{ key: "volt110", text: "전압을 <b>110 V</b> 로 내려 확인하기" }],
      why: "<b>4분의 1인 300 W</b> 가 됩니다. 절반이 아니에요!<br>" +
           "기구의 <b>저항은 그대로</b>이므로 전력은 전압의 <b>제곱</b>에 비례합니다 — " +
           "<b>P = V² ÷ R</b>. 전압이 절반이면 (1/2)² = <b>1/4</b> 이 되는 것이죠.<br>" +
           "그래서 정격 전압이 아닌 곳에 꽂으면 기구가 <b>제대로 작동하지 않습니다.</b> " +
           "<em>이것이 ‘정격 전압’을 정해 두는 이유입니다.</em>"
    },
    {
      id: 5, star: "🏠", title: "전력량이 가장 큰 것은?",
      story: "우리 집 가전제품 다섯 개다. <b>소비 전력</b>이 가장 큰 것은 다리미(1000 W)인데, " +
             "<b>하루 전력량</b>이 가장 큰 것도 다리미일까?",
      scene: "home", setup: { homeName: "다리미" }, allow: ["homeDev", "hours"],
      predict: { q: "하루 전력량이 가장 큰 가전제품은?",
                 opts: ["다리미 (1000 W · 30분)", "<b>스피커 (800 W · 2시간)</b>", "선풍기 (40 W · 10시간)"], ans: 1 },
      goals: [{ key: "biggest", text: "<b>스피커</b>를 골라 전력량 확인하기" }],
      why: "<b>스피커</b>입니다. 전력량 = 소비 전력 × 시간이니까요.<br>" +
           "· 다리미 1000 W × <b>0.5시간</b> = <b>500 Wh</b><br>" +
           "· 스피커 800 W × <b>2시간</b> = <b>1600 Wh</b><br>" +
           "<b>소비 전력이 큰 것과 전력량이 큰 것은 다릅니다.</b> " +
           "세더라도 <b>짧게</b> 쓰면 전력량은 작고, 약해도 <b>오래</b> 쓰면 커져요. " +
           "전기 요금은 <b>전력량</b>으로 매깁니다."
    },
    {
      id: 6, star: "💨", title: "헤어드라이어 10분 = 선풍기 몇 시간?",
      story: "<b>헤어드라이어</b>(1760 W)를 <b>10분</b> 쓸 때의 전기 에너지로 " +
             "<b>선풍기</b>(44 W)를 얼마나 오래 쓸 수 있을까?",
      scene: "watt", setup: { devName: "헤어드라이어", sec: 60 }, allow: ["dev", "sec"],
      predict: { q: "헤어드라이어 10분 = 선풍기 몇 시간?",
                 opts: ["약 40분", "약 1시간 40분", "<b>약 6시간 40분</b>"], ans: 2 },
      goals: [{ key: "dryer", text: "헤어드라이어를 <b>600초(10분)</b> 로 맞춰 보기" }],
      why: "<b>약 6시간 40분</b> 입니다.<br>" +
           "헤어드라이어 10분 = 1760 W × 600초 = <b>1,056,000 J</b><br>" +
           "선풍기로는 1,056,000 ÷ 44 = <b>24,000초</b> = 400분 = <b>6시간 40분</b><br>" +
           "소비 전력이 40배 차이 나니(1760 ÷ 44 = 40), 같은 에너지로 <b>40배 오래</b> 쓸 수 있습니다.<br>" +
           "<em>전기를 아끼려면 <b>전력이 큰 기구를 짧게</b> 쓰는 것이 효과가 큽니다.</em>"
    }
  ];

  /* ---------------------------------------------------------
     2. 장면 · 크기
     --------------------------------------------------------- */
  function sceneKind() {
    if (S.scene === "mission") return S.mission ? S.mission.scene : "watt";
    return S.scene;
  }

  function layout() {
    if (!canvas) return;
    var r = canvas.getBoundingClientRect();
    cssW = Math.max(320, Math.round(r.width || 900));
    cssH = Math.max(200, Math.round(r.height || cssW / 1.62));
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------------------------------------------------------
     3. 그리기
     --------------------------------------------------------- */
  var COL = { ink: "#e2e8f0", faint: "#64748b", line: "#94a3b8", warm: "#fbbf24", cool: "#60a5fa" };

  function draw() {
    if (!ctx) return;
    var g = ctx;
    var grad = g.createLinearGradient(0, 0, 0, cssH);
    grad.addColorStop(0, "#0b1220"); grad.addColorStop(1, "#1e293b");
    g.fillStyle = grad; g.fillRect(0, 0, cssW, cssH);
    var k = sceneKind();
    if (k === "watt") drawWatt(g);
    else if (k === "volt") drawVolt(g);
    else drawHome(g);
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  /* ---- 장면 ① 소비 전력 : 1초마다 쌓인다 ---- */
  function drawWatt(g) {
    var d = dev();
    var joule = W.energyJ(d.w, S.sec);

    /* 기구 */
    g.font = "56px sans-serif"; g.textAlign = "center";
    g.fillText(d.icon, cssW * 0.16, cssH * 0.30);
    g.fillStyle = COL.ink; g.font = "bold 20px sans-serif";
    g.fillText(d.name, cssW * 0.16, cssH * 0.30 + 34);
    g.fillStyle = COL.warm; g.font = "bold 24px sans-serif";
    g.fillText(d.w + " W", cssW * 0.16, cssH * 0.30 + 64);
    g.fillStyle = COL.faint; g.font = "14px sans-serif";
    g.fillText(d.convert, cssW * 0.16, cssH * 0.30 + 88);

    /* 1초마다 쌓이는 에너지 덩어리 */
    var bx = cssW * 0.34, by = cssH * 0.16, bw = cssW * 0.60, bh = cssH * 0.52;
    g.strokeStyle = "rgba(148,163,184,.35)"; g.lineWidth = 1.5;
    roundRect(g, bx, by, bw, bh, 10); g.stroke();

    var n = Math.min(S.sec, 60);              // 최대 60칸까지만 그린다
    var cols = Math.ceil(Math.sqrt(n * bw / bh)) || 1;
    var rows = Math.ceil(n / cols);
    var cw = bw / cols, ch = bh / Math.max(rows, 1);
    var cell = Math.min(cw, ch) * 0.82;
    for (var i = 0; i < n; i++) {
      var r0 = Math.floor(i / cols), c0 = i % cols;
      var x = bx + cw * c0 + (cw - cell) / 2, y = by + ch * r0 + (ch - cell) / 2;
      g.fillStyle = "rgba(251,191,36," + (0.35 + 0.5 * (i / Math.max(n - 1, 1))) + ")";
      roundRect(g, x, y, cell, cell, 3); g.fill();
    }
    g.fillStyle = COL.faint; g.font = "13px sans-serif"; g.textAlign = "left";
    g.fillText("네모 한 칸 = 1초 동안 쓴 " + d.w + " J" +
               (S.sec > 60 ? "  (60칸까지만 그립니다)" : ""), bx + 4, by - 8);

    /* 결과 */
    g.textAlign = "center";
    g.fillStyle = COL.warm; g.font = "bold 26px sans-serif";
    g.fillText(fmt(joule) + " J", bx + bw / 2, by + bh + 34);
    g.fillStyle = COL.ink; g.font = "16px sans-serif";
    g.fillText(d.w + " W × " + S.sec + " 초 = " + fmt(joule) + " J", bx + bw / 2, by + bh + 58);

    g.fillStyle = COL.faint; g.font = "14px sans-serif"; g.textAlign = "left";
    g.fillText("W 는 '1초에 몇 J' — 시간을 곱하면 전기 에너지가 된다", 16, 26);
  }

  /* ---- 장면 ② 정격 전압 ---- */
  function drawVolt(g) {
    var d = dev();
    var p = W.powerAt(d.w, W.STD_VOLT, S.volt);
    var ratio = S.volt / W.STD_VOLT;

    g.font = "50px sans-serif"; g.textAlign = "center";
    g.fillText(d.icon, cssW * 0.16, cssH * 0.28);
    g.fillStyle = COL.ink; g.font = "bold 19px sans-serif";
    g.fillText(d.name, cssW * 0.16, cssH * 0.28 + 30);
    g.fillStyle = COL.faint; g.font = "14px sans-serif";
    g.fillText("정격 " + W.STD_VOLT + " V · " + d.w + " W", cssW * 0.16, cssH * 0.28 + 52);

    /* 전압 막대와 전력 막대 */
    var bx = cssW * 0.34, bw = cssW * 0.58;
    var rows = [
      { label: "전압", val: S.volt, full: 240, unit: " V", col: "#60a5fa", ref: W.STD_VOLT },
      { label: "소비 전력", val: p, full: d.w * 1.2, unit: " W", col: "#fbbf24", ref: d.w }
    ];
    rows.forEach(function (r, i) {
      var y = cssH * (0.24 + i * 0.24);
      g.fillStyle = COL.ink; g.font = "bold 16px sans-serif"; g.textAlign = "left";
      g.fillText(r.label, bx, y - 10);
      g.fillStyle = "rgba(148,163,184,.22)";
      roundRect(g, bx, y, bw, 30, 6); g.fill();
      g.fillStyle = r.col;
      roundRect(g, bx, y, bw * clamp(r.val / r.full, 0, 1), 30, 6); g.fill();
      /* 정격 지점 표시 */
      var rx = bx + bw * clamp(r.ref / r.full, 0, 1);
      g.strokeStyle = "#fff"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(rx, y - 5); g.lineTo(rx, y + 35); g.stroke();
      g.fillStyle = COL.ink; g.font = "bold 17px sans-serif"; g.textAlign = "left";
      g.fillText(fmt(r.val) + r.unit, bx + 8, y + 21);
      g.fillStyle = COL.faint; g.font = "12px sans-serif"; g.textAlign = "center";
      g.fillText("정격", rx, y + 48);
    });

    /* 제곱 관계 */
    g.textAlign = "center";
    g.fillStyle = COL.warm; g.font = "bold 20px sans-serif";
    g.fillText("전압 " + ratio.toFixed(2) + " 배  →  전력 " + (ratio * ratio).toFixed(2) + " 배",
               cssW / 2, cssH * 0.82);
    g.fillStyle = COL.ink; g.font = "16px sans-serif";
    g.fillText("P = V² ÷ R  (저항 R = " + fmt(W.resistance(d.w, W.STD_VOLT)) + " Ω 는 그대로)",
               cssW / 2, cssH * 0.82 + 26);

    if (Math.abs(S.volt - 110) < 3) {
      g.fillStyle = "#f87171"; g.font = "bold 15px sans-serif";
      g.fillText("110 V 에서는 정격의 4분의 1 — 제대로 작동하지 않는다", cssW / 2, cssH - 14);
    }
  }

  /* ---- 장면 ③ 우리 집 전력량 ---- */
  function drawHome(g) {
    var maxWh = 1;
    home.forEach(function (h) { maxWh = Math.max(maxWh, W.wattHour(h.w, h.hours)); });

    /* 막대 오른쪽에 값을 적으므로, 그 글자 자리(92px)를 미리 빼 둔다.
       빼지 않으면 값이 큰 항목에서 글자가 무대 밖으로 나간다. */
    var bx = cssW * 0.30, bw = Math.max(60, cssW - bx - 100);
    var top = cssH * 0.12, rowH = (cssH * 0.66) / home.length;

    home.forEach(function (h, i) {
      var y = top + rowH * i;
      var wh = W.wattHour(h.w, h.hours);
      var on = (h.name === S.homeName);

      g.font = "22px sans-serif"; g.textAlign = "left";
      g.fillText(h.icon, 16, y + rowH * 0.55);
      g.fillStyle = on ? "#fde047" : COL.ink;
      g.font = (on ? "bold " : "") + "16px sans-serif";
      g.fillText(h.name, 46, y + rowH * 0.45);
      g.fillStyle = COL.faint; g.font = "13px sans-serif";
      g.fillText(h.w + " W · " + h.hours + " 시간", 46, y + rowH * 0.72);

      g.fillStyle = "rgba(148,163,184,.18)";
      roundRect(g, bx, y + rowH * 0.18, bw, rowH * 0.5, 5); g.fill();
      g.fillStyle = on ? "#fbbf24" : "rgba(251,191,36,.5)";
      /* ⚠ 최소 길이(예전 0.01)를 두지 않는다. 12 Wh 짜리 막대가 실제보다
         30% 길게 그려져, 막대 길이가 값과 어긋났다. 값은 옆에 숫자로도 적힌다. */
      roundRect(g, bx, y + rowH * 0.18, bw * clamp(wh / maxWh, 0, 1), rowH * 0.5, 5); g.fill();

      g.fillStyle = COL.ink; g.font = (on ? "bold " : "") + "15px sans-serif"; g.textAlign = "right";
      g.fillText(fmt(wh) + " Wh", cssW - 12, y + rowH * 0.52);
    });

    var total = W.totalWh(home);
    g.textAlign = "center";
    g.fillStyle = COL.warm; g.font = "bold 20px sans-serif";
    g.fillText("하루 합계 " + fmt(total) + " Wh = " + (total / 1000).toFixed(3) + " kWh", cssW / 2, cssH - 34);
    g.fillStyle = COL.faint; g.font = "14px sans-serif";
    g.fillText("전력량 = 소비 전력(W) × 시간(h) · 전기 요금은 전력량으로 매긴다", cssW / 2, cssH - 12);

    g.fillStyle = COL.faint; g.font = "13px sans-serif"; g.textAlign = "left";
    g.fillText("소비 전력이 큰 것과 전력량이 큰 것은 다르다", 16, 22);
  }

  function fmt(v) {
    if (!isFinite(v)) return "∞";
    if (v >= 100000) return Math.round(v).toLocaleString();
    if (v >= 1000) return Math.round(v).toLocaleString();
    if (v >= 100) return v.toFixed(0);
    if (v >= 10) return v.toFixed(1);
    return v.toFixed(2);
  }

  /* ---------------------------------------------------------
     4. 계기판
     --------------------------------------------------------- */
  function setBar(id, val, full) {
    $(id).querySelector(".bar-fill").style.width = clamp(val / full * 100, 0, 100) + "%";
  }
  function barText(id, t) { $(id).querySelector(".bar-val").textContent = t; }
  function ro(i, name, val, unit) {
    $("roName" + i).textContent = name; $("roVal" + i).textContent = val;
    $("roUnit" + i).textContent = unit || "";
  }

  function updatePanel() {
    var k = sceneKind();

    if (k === "watt") {
      var d = dev(), j = W.energyJ(d.w, S.sec);
      $("gaugeTitle").textContent = "💡 전기 에너지";
      $("gaugeSub").innerHTML = "1초에 <b>" + d.w + " J</b> 씩 쌓인다";
      $("barName1").textContent = "소비 전력";
      $("rowB").classList.add("hidden");
      setBar("barA", d.w, 1800); barText("barA", d.w + " W");
      ro(1, "소비 전력", d.w, " W");
      ro(2, "사용 시간", S.sec, " 초");
      ro(3, "전기 에너지", fmt(j), " J");
      ro(4, "전력량으로", W.jToWh(j).toFixed(2), " Wh");
      $("fLaw").innerHTML = '전기 에너지 = 소비 전력 × 시간 = <span class="k">' + d.w +
                            '</span> W × <span class="k">' + S.sec + '</span> 초 = <span class="t">' + fmt(j) + '</span> J';
      $("fWhy").innerHTML = '<em>' + d.convert + ' · ' + W.humanTime(S.sec) + ' 동안</em>';
      $("graphTitle").textContent = "📈 시간에 따른 전기 에너지";
      $("graphSub").innerHTML = "전력이 클수록 <b>가파르다</b>";

    } else if (k === "volt") {
      var d2 = dev(), p = W.powerAt(d2.w, W.STD_VOLT, S.volt);
      $("gaugeTitle").textContent = "🔌 정격 전압";
      $("gaugeSub").innerHTML = "전압이 달라지면 전력은 <b>제곱</b>으로";
      $("barName1").textContent = "지금 전력";
      $("barName2").textContent = "정격 전력";
      $("rowB").classList.remove("hidden");
      setBar("barA", p, d2.w); barText("barA", fmt(p) + " W");
      setBar("barB", d2.w, d2.w); barText("barB", d2.w + " W");
      ro(1, "꽂은 전압", S.volt, " V");
      ro(2, "정격 전압", W.STD_VOLT, " V");
      ro(3, "지금 소비 전력", fmt(p), " W");
      ro(4, "정격 대비", ((p / d2.w) * 100).toFixed(0), " %");
      $("fLaw").innerHTML = 'P = P₀ × (V ÷ V₀)² = ' + d2.w + ' × (' + S.volt + ' ÷ ' + W.STD_VOLT +
                            ')² = <span class="k">' + fmt(p) + '</span> W';
      $("fWhy").innerHTML = (Math.abs(S.volt - W.STD_VOLT) < 1)
        ? '<em>정격 전압이다 — 이 기구가 제대로 작동하는 전압</em>'
        : '<em>전압이 ' + (S.volt / W.STD_VOLT).toFixed(2) + ' 배 → 전력은 그 <b>제곱</b>인 ' +
          ((S.volt / W.STD_VOLT) * (S.volt / W.STD_VOLT)).toFixed(2) + ' 배</em>';
      $("graphTitle").textContent = "📈 전압과 소비 전력";
      $("graphSub").innerHTML = "직선이 아니라 <b>곡선</b>이다";

    } else {
      var h = homeDev(), wh = W.wattHour(h.w, h.hours), total = W.totalWh(home);
      $("gaugeTitle").textContent = "🏠 전력량";
      $("gaugeSub").innerHTML = "소비 전력 × <b>시간</b>";
      $("barName1").textContent = h.name;
      $("barName2").textContent = "하루 합계";
      $("rowB").classList.remove("hidden");
      setBar("barA", wh, Math.max(total, 1)); barText("barA", fmt(wh) + " Wh");
      setBar("barB", total, Math.max(total, 1)); barText("barB", fmt(total) + " Wh");
      ro(1, "소비 전력", h.w, " W");
      ro(2, "하루 사용", h.hours, " 시간");
      ro(3, "전력량", fmt(wh), " Wh");
      ro(4, "하루 합계", (total / 1000).toFixed(3), " kWh");
      $("fLaw").innerHTML = '전력량 = 소비 전력 × 시간 = <span class="k">' + h.w +
                            '</span> W × <span class="k">' + h.hours + '</span> h = <span class="t">' + fmt(wh) + '</span> Wh';
      var top = W.byWhDesc(home)[0];
      $("fWhy").innerHTML = '<em>' + h.convert + ' · 하루 전력량이 가장 큰 것은 <b>' + top.name + '</b> (' +
                            fmt(W.wattHour(top.w, top.hours)) + ' Wh)</em>';
      $("graphTitle").textContent = "📈 소비 전력 vs 전력량";
      $("graphSub").innerHTML = "센 것과 <b>많이 쓰는 것</b>은 다르다";
    }

    $("tip").textContent = tipText();
    syncMissionGoals();
  }

  function tipText() {
    var k = sceneKind();
    if (k === "watt") return "기구를 고르고 시간을 밀어 보세요";
    if (k === "volt") return "전압을 110 V 로 내려 보세요";
    return "가전제품을 고르고 사용 시간을 바꿔 보세요";
  }

  /* ---------------------------------------------------------
     5. 그래프
     --------------------------------------------------------- */
  function drawGraph() {
    var c = $("graph");
    if (!c) return;
    var r = c.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.max(200, Math.round(r.width)), h = Math.max(100, Math.round(r.height));
    if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    var g = c.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#fff"; g.fillRect(0, 0, w, h);
    var pad = 28, k = sceneKind();
    g.strokeStyle = "#cbd5e1"; g.lineWidth = 1;
    g.beginPath(); g.moveTo(pad, h - pad); g.lineTo(w - 6, h - pad);
    g.moveTo(pad, 6); g.lineTo(pad, h - pad); g.stroke();

    if (k === "watt") {
      var d = dev(), maxSec = Math.max(S.sec, 10);
      var maxJ = d.w * maxSec;
      g.strokeStyle = "#f59e0b"; g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(pad, h - pad);
      g.lineTo(pad + (w - pad - 6), (h - pad) - (h - pad - 6) * clamp(maxJ / Math.max(maxJ, 1), 0, 1));
      g.stroke();
      var px = pad + (w - pad - 6) * (S.sec / maxSec);
      var py = (h - pad) - (h - pad - 6) * (W.energyJ(d.w, S.sec) / Math.max(maxJ, 1));
      g.fillStyle = "#dc2626"; g.beginPath(); g.arc(px, py, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#64748b"; g.font = "12px sans-serif"; g.textAlign = "center";
      g.fillText("시간(초)", w / 2, h - 6);
      g.textAlign = "left";
      g.fillText(fmt(W.energyJ(d.w, S.sec)) + " J", pad + 4, 16);

    } else if (k === "volt") {
      var d2 = dev();
      g.strokeStyle = "#2563eb"; g.lineWidth = 2.5;
      g.beginPath();
      for (var i = 0; i <= 60; i++) {
        var v = 240 * i / 60;
        var x = pad + (w - pad - 6) * (v / 240);
        var y = (h - pad) - (h - pad - 6) * clamp(W.powerAt(d2.w, W.STD_VOLT, v) / (d2.w * 1.2), 0, 1);
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
      var vx = pad + (w - pad - 6) * (S.volt / 240);
      var vy = (h - pad) - (h - pad - 6) * clamp(W.powerAt(d2.w, W.STD_VOLT, S.volt) / (d2.w * 1.2), 0, 1);
      g.fillStyle = "#dc2626"; g.beginPath(); g.arc(vx, vy, 5, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#64748b"; g.font = "12px sans-serif"; g.textAlign = "center";
      g.fillText("전압(V)", w / 2, h - 6);

    } else {
      /* 소비 전력(가로) vs 전력량(세로) */
      var maxW = 1, maxWh = 1;
      home.forEach(function (x) { maxW = Math.max(maxW, x.w); maxWh = Math.max(maxWh, W.wattHour(x.w, x.hours)); });
      home.forEach(function (x) {
        var px2 = pad + (w - pad - 10) * (x.w / maxW);
        var py2 = (h - pad) - (h - pad - 10) * (W.wattHour(x.w, x.hours) / maxWh);
        var on = x.name === S.homeName;
        g.fillStyle = on ? "#dc2626" : "#94a3b8";
        g.beginPath(); g.arc(px2, py2, on ? 6 : 4, 0, Math.PI * 2); g.fill();
        if (on) {
          g.fillStyle = "#dc2626"; g.font = "bold 12px sans-serif"; g.textAlign = "center";
          g.fillText(x.name, px2, py2 - 10);
        }
      });
      g.fillStyle = "#64748b"; g.font = "12px sans-serif"; g.textAlign = "center";
      g.fillText("소비 전력(W) →", w / 2, h - 6);
      g.save(); g.translate(11, h / 2); g.rotate(-Math.PI / 2);
      g.fillText("← 전력량(Wh)", 0, 0); g.restore();
    }
  }

  /* ---------------------------------------------------------
     6. 조작 패널
     --------------------------------------------------------- */
  function syncControls() {
    var k = sceneKind();
    var allow = (S.scene === "mission" && S.mission) ? S.mission.allow : null;
    document.querySelectorAll("[data-for]").forEach(function (el) {
      var scenes = el.getAttribute("data-for").split(/\s+/);
      var need = el.getAttribute("data-need");
      var okScene = scenes.indexOf(S.scene) >= 0 || scenes.indexOf(k) >= 0;
      var okNeed = true;
      if (S.scene === "mission" && need) okNeed = allow && allow.indexOf(need) >= 0;
      el.classList.toggle("hidden", !(okScene && okNeed));
    });
    $("missionCard").classList.toggle("hidden", S.scene !== "mission");
    $("valSec").textContent = S.sec + " 초" + (S.sec >= 60 ? " (" + W.humanTime(S.sec) + ")" : "");
    $("valVolt").textContent = S.volt + " V";
    $("valHours").textContent = S.hours + " 시간";
  }

  /* ---------------------------------------------------------
     7. 미션
     --------------------------------------------------------- */
  function loadProgress() {
    try { return JSON.parse(sessionStorage.getItem("el_missions") || "[]"); } catch (e) { return []; }
  }
  function saveProgress(l) { try { sessionStorage.setItem("el_missions", JSON.stringify(l)); } catch (e) {} }

  function renderMissionList() {
    var done = loadProgress(), host = $("missionList");
    host.innerHTML = "";
    MISSIONS.forEach(function (M) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "mcard" + (S.mission && S.mission.id === M.id ? " on" : "") +
                    (done.indexOf(M.id) >= 0 ? " done" : "");
      b.innerHTML = '<span class="mno">미션 ' + M.id + (done.indexOf(M.id) >= 0 ? " ✅" : "") + '</span>' +
                    '<span class="mtitle"><span class="mstar">' + M.star + '</span> ' + M.title + '</span>';
      b.addEventListener("click", function () { pickMission(M); });
      host.appendChild(b);
    });
    $("missionScore").textContent = done.length + " / " + MISSIONS.length;
  }

  function pickMission(M) {
    S.scene = "mission";
    $("scenes").querySelectorAll(".scene-btn").forEach(function (x) {
      x.classList.toggle("on", x.getAttribute("data-scene") === "mission");
    });
    S.mission = M; S.predictPick = null;
    S.missionState = M.predict ? "predict" : "ready";
    Object.keys(M.setup || {}).forEach(function (kk) { S[kk] = M.setup[kk]; });
    seen = { j44: false, j10750: false, sec20: false, volt110: false, biggest: false, dryer: false };
    $("rngSec").value = S.sec; $("rngVolt").value = S.volt; $("rngHours").value = S.hours;
    $("selDev").value = S.devName; $("selHome").value = S.homeName;
    syncControls(); renderMissionList(); renderMissionBody(); refresh();
  }

  function renderMissionBody() {
    var M = S.mission, body = $("missionBody");
    if (!M) { body.classList.add("hidden"); return; }
    body.classList.remove("hidden");
    $("mTitle").textContent = M.star + " 미션 " + M.id + " · " + M.title;
    $("mStory").innerHTML = M.story;

    var pd = $("mPredict");
    if (M.predict && S.missionState === "predict") {
      pd.classList.remove("hidden");
      $("mQ").innerHTML = M.predict.q;
      var opts = $("mOpts"); opts.innerHTML = "";
      M.predict.opts.forEach(function (t, i) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "opt"; b.innerHTML = t;
        b.addEventListener("click", function () {
          S.predictPick = i; S.missionState = "ready"; renderMissionBody();
        });
        opts.appendChild(b);
      });
    } else pd.classList.add("hidden");

    var gl = $("mGoals");
    if (M.goals && S.missionState !== "predict") {
      gl.classList.remove("hidden");
      gl.innerHTML = '<div class="q">목표</div>' + M.goals.map(function (gg) {
        var ok = checkGoal(gg.key);
        return '<div class="goal' + (ok ? " ok" : "") + '">' + (ok ? "✅ " : "⬜ ") + gg.text + '</div>';
      }).join("");
    } else gl.classList.add("hidden");

    var vd = $("mVerdict");
    if (S.missionState === "won") {
      vd.className = "verdict ok";
      vd.innerHTML = "<b>🎉 성공!</b>" + M.why +
        (M.predict && S.predictPick != null
          ? "<br><br>" + (S.predictPick === M.predict.ans
              ? "예측도 <b>맞았습니다.</b> 잘했어요!"
              : "예측은 달랐지만 <b>직접 확인해서 알아냈습니다.</b> 그것이 더 중요해요.")
          : "");
      vd.classList.remove("hidden");
    } else if (S.missionState === "predict") vd.classList.add("hidden");
    else {
      vd.className = "verdict no";
      vd.innerHTML = "<b>직접 확인하세요</b>목표를 모두 채우면 이유가 열립니다.";
      vd.classList.remove("hidden");
    }
  }

  function checkGoal(key) {
    switch (key) {
      case "j44": return seen.j44;
      case "j10750": return seen.j10750;
      case "sec20": return seen.sec20;
      case "volt110": return seen.volt110;
      case "biggest": return seen.biggest;
      case "dryer": return seen.dryer;
      default: return false;
    }
  }

  function noteSeen() {
    var k = sceneKind();
    if (k === "watt") {
      if (S.devName === "선풍기" && S.sec === 1) seen.j44 = true;
      if (S.devName === "전기다리미" && S.sec === 10) seen.j10750 = true;
      if (S.devName === "스탠드" && S.sec === 20) seen.sec20 = true;
      if (S.devName === "헤어드라이어" && S.sec === 600) seen.dryer = true;
    } else if (k === "volt") {
      if (Math.abs(S.volt - 110) < 3) seen.volt110 = true;
    } else {
      if (S.homeName === "스피커") seen.biggest = true;
    }
  }

  function syncMissionGoals() {
    if (S.scene !== "mission" || !S.mission || S.missionState === "predict") return;
    var M = S.mission;
    if (!M.goals) return;
    var all = M.goals.every(function (gg) { return checkGoal(gg.key); });
    if (all && S.missionState !== "won") {
      S.missionState = "won";
      var done = loadProgress();
      if (done.indexOf(M.id) < 0) { done.push(M.id); saveProgress(done); }
      renderMissionList(); renderMissionBody();
    } else if (S.missionState !== "won") {
      var gl = $("mGoals");
      if (!gl.classList.contains("hidden")) {
        var rows = gl.querySelectorAll(".goal");
        M.goals.forEach(function (gg, i) {
          if (!rows[i]) return;
          var ok = checkGoal(gg.key);
          rows[i].className = "goal" + (ok ? " ok" : "");
          rows[i].innerHTML = (ok ? "✅ " : "⬜ ") + gg.text;
        });
      }
    }
  }

  /* ---------------------------------------------------------
     8. 실험 기록
     --------------------------------------------------------- */
  function addRecord() {
    var k = sceneKind(), r;
    if (k === "watt") {
      var d = dev();
      r = { scene: "소비 전력", who: d.name, w: d.w + " W", t: S.sec + " 초",
            e: fmt(W.energyJ(d.w, S.sec)) + " J" };
    } else if (k === "volt") {
      var d2 = dev(), p = W.powerAt(d2.w, W.STD_VOLT, S.volt);
      r = { scene: "정격 전압", who: d2.name, w: fmt(p) + " W", t: S.volt + " V",
            e: "정격의 " + ((p / d2.w) * 100).toFixed(0) + "%" };
    } else {
      var h = homeDev();
      r = { scene: "전력량", who: h.name, w: h.w + " W", t: h.hours + " 시간",
            e: fmt(W.wattHour(h.w, h.hours)) + " Wh" };
    }
    records.push(r); renderRecords();
    window.PdfKit.toast("기록했습니다. (" + records.length + "번째)", "ok");
  }

  function renderRecords() {
    var body = $("recBody");
    body.innerHTML = "";
    records.forEach(function (r, i) {
      var tr = document.createElement("tr");
      tr.innerHTML = "<td>" + (i + 1) + "</td><td>" + r.scene + "</td><td>" + r.who +
                     "</td><td>" + r.w + "</td><td>" + r.t + "</td><td><b>" + r.e + "</b></td>";
      body.appendChild(tr);
    });
    $("recEmpty").classList.toggle("hidden", records.length > 0);
  }

  function refresh() { noteSeen(); draw(); updatePanel(); drawGraph(); }

  /* ---------------------------------------------------------
     9. 연결
     --------------------------------------------------------- */
  function range(id, fn) {
    var el = $(id);
    if (el) el.addEventListener("input", function () { fn(parseFloat(el.value)); });
  }

  function bind() {
    $("scenes").addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".scene-btn") : null;
      if (!b) return;
      $("scenes").querySelectorAll(".scene-btn").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on");
      S.scene = b.getAttribute("data-scene");
      if (S.scene === "mission" && !S.mission) pickMission(MISSIONS[0]);
      else { syncControls(); refresh(); }
      renderMissionList();
    });

    $("btnReset").addEventListener("click", function () {
      S.sec = 1; S.volt = 220; S.hours = 6; S.devName = "선풍기"; S.homeName = "전등";
      home.forEach(function (h, i) { h.hours = W.HOME[i].hours; });
      $("rngSec").value = 1; $("rngVolt").value = 220; $("rngHours").value = 6;
      $("selDev").value = S.devName; $("selHome").value = S.homeName;
      syncControls(); refresh();
    });
    $("btnRecord").addEventListener("click", addRecord);
    $("btnClearRec").addEventListener("click", function () {
      if (!records.length) return;
      if (!confirm("기록을 모두 지울까요?")) return;
      records.length = 0; renderRecords();
    });

    range("rngSec", function (v) { S.sec = v; syncControls(); refresh(); });
    range("rngVolt", function (v) { S.volt = v; syncControls(); refresh(); });
    range("rngHours", function (v) {
      S.hours = v; homeDev().hours = v; syncControls(); refresh();
    });

    var sd = $("selDev");
    W.APPLIANCES.forEach(function (d) {
      var o = document.createElement("option");
      o.value = d.name; o.textContent = d.icon + " " + d.name + " (" + d.w + " W)";
      sd.appendChild(o);
    });
    sd.value = S.devName;
    sd.addEventListener("change", function () { S.devName = sd.value; refresh(); });

    var sh = $("selHome");
    home.forEach(function (h) {
      var o = document.createElement("option");
      o.value = h.name; o.textContent = h.icon + " " + h.name + " (" + h.w + " W)";
      sh.appendChild(o);
    });
    sh.value = S.homeName;
    sh.addEventListener("change", function () {
      S.homeName = sh.value; S.hours = homeDev().hours;
      $("rngHours").value = S.hours; syncControls(); refresh();
    });

    if (window.ResizeObserver) {
      new ResizeObserver(function () { layout(); draw(); drawGraph(); }).observe(canvas);
    } else {
      window.addEventListener("resize", function () { layout(); draw(); drawGraph(); });
    }
  }

  function boot() {
    canvas = $("stage");
    layout(); bind(); syncControls();
    renderMissionList(); renderRecords(); refresh();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.ElLab = {
    S: S, MISSIONS: MISSIONS, home: home,
    _test: {
      set: function (k, v) { S[k] = v; if (k === "hours") homeDev().hours = v; syncControls(); refresh(); },
      scene: function (n) { S.scene = n; syncControls(); refresh(); },
      pick: function (id) { pickMission(MISSIONS[id - 1]); },
      answer: function (i) { S.predictPick = i; S.missionState = "ready"; renderMissionBody(); refresh(); },
      goals: function () {
        if (!S.mission || !S.mission.goals) return null;
        return S.mission.goals.map(function (gg) { return [gg.key, checkGoal(gg.key)]; });
      },
      state: function () { return S.missionState; },
      records: function () { return records; },
      draw: function () { draw(); return true; }
    }
  };
})();
