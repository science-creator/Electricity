/* =========================================================
   power.js — 소비 전력과 전력량 계산 엔진
   ---------------------------------------------------------
   이 파일은 화면을 전혀 모른다. 숫자만 만든다.
   (앞선 네 앱의 physics.js · induction.js · stars.js · parallax.js 와 같은 역할)

   ⚠ ES 모듈(import/export)을 쓰지 않는다. 더블클릭(file://)으로도 열려야 한다.

   ---------------------------------------------------------
   엔진의 핵심 아이디어 — 여기를 고칠 사람은 반드시 읽을 것
   ---------------------------------------------------------

   1. **W 는 '1초에 몇 J'** 이라는 한 문장으로 모든 계산을 푼다

      선생님 학습지의 정의 그대로 —
        "소비전력 : 1초 동안 전기 기구가 소모하는 전기 에너지의 양"
        "40W 는 1초 동안 40J 의 전기에너지를 소모한다는 의미"

      학생이 여기서 막히는 이유는 **W · J · Wh 세 단위가 따로 논다고 느끼기 때문**이다.
      그래서 이 엔진은 함수를 세 개만 두고, 셋이 모두 같은 한 줄에서 나온다.
        · 전기 에너지 E(J)   = P(W) × 시간(초)
        · 전력량   E(Wh)     = P(W) × 시간(시간)
        · 시간               = E ÷ P            ← 거꾸로 묻는 문항(학습지 Q)
      **J 와 Wh 는 다른 양이 아니라 '시간을 초로 쟀느냐 시간으로 쟀느냐'의 차이뿐이다.**
      1 Wh = 3600 J 이 그것을 이어 준다.

   2. 정격 전압이 아니면 전력이 **제곱으로** 줄어든다

      학습지의 물음 — "전열기를 110V 콘센트에 연결할 때에도 1초에 1200J 을 소비할까?"
      답은 '아니다'인데, 그냥 '작아진다'가 아니라 **4분의 1**이 된다는 것이 핵심이다.

      기구의 저항 R 은 그대로이므로 (R = V₀² ÷ P₀),
        P = V² ÷ R = P₀ × (V ÷ V₀)²
      전압이 절반이면 전력은 **(1/2)² = 1/4**. 이 제곱이 이 장면의 결론이다.

      ⚠ 실제 전열기는 온도가 오르면 저항이 조금 변하지만, 중학교 범위에서는
        **저항을 일정하다고 본다.** 그렇게 두어야 위 식이 그대로 성립한다.

   3. 가전제품 값은 **선생님 학습지의 표를 그대로** 쓴다

      스탠드 7W · 선풍기 44W · 전기다리미 1075W · 헤어드라이어 1760W,
      가정용 표는 전등 30W 6시간 · 선풍기 40W 10시간 · 다리미 1000W 30분 ·
      스피커 800W 2시간 · 배터리충전기 6W 2시간.
      **숫자를 '더 실제 같게' 고치지 말 것** — 학생이 종이와 화면을 나란히 놓고 본다.
   ========================================================= */
(function (global) {
  "use strict";

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  var J_PER_WH = 3600;          // 1 Wh = 3600 J
  var STD_VOLT = 220;           // 우리나라 가정용 정격 전압

  /* ---------------------------------------------------------
     1. 전기 에너지와 전력량 — 모두 'W = 1초에 몇 J' 에서 나온다
     --------------------------------------------------------- */

  /* 전기 에너지 (J) = 소비 전력(W) × 시간(초) */
  function energyJ(watt, sec) { return watt * sec; }

  /* 전력량 (Wh) = 소비 전력(W) × 시간(시간) */
  function wattHour(watt, hours) { return watt * hours; }

  function kWh(watt, hours) { return wattHour(watt, hours) / 1000; }

  /* 어떤 에너지를 쓰는 데 걸리는 시간(초) — 학습지의 '거꾸로' 문항 */
  function secondsFor(watt, joule) { return watt > 0 ? joule / watt : Infinity; }

  /* J ↔ Wh */
  function jToWh(j) { return j / J_PER_WH; }
  function whToJ(wh) { return wh * J_PER_WH; }

  /* ---------------------------------------------------------
     2. 정격 전압과 실제 전압
        저항은 일정하다고 본다 → P = P₀ × (V ÷ V₀)²
     --------------------------------------------------------- */
  function resistance(ratedW, ratedV) {
    return ratedW > 0 ? (ratedV * ratedV) / ratedW : Infinity;
  }

  function powerAt(ratedW, ratedV, volt) {
    var r = volt / ratedV;
    return ratedW * r * r;
  }

  function currentAt(watt, volt) { return volt > 0 ? watt / volt : 0; }

  /* ---------------------------------------------------------
     3. 가전제품 — 선생님 학습지의 소비전력 표 (정격 220V)
     --------------------------------------------------------- */
  var APPLIANCES = [
    { name: "배터리 충전기", icon: "🔋", w: 6,    convert: "전기 → 화학 에너지" },
    { name: "스탠드",        icon: "💡", w: 7,    convert: "전기 → 빛 에너지" },
    { name: "전등",          icon: "🔆", w: 30,   convert: "전기 → 빛 에너지" },
    { name: "선풍기",        icon: "🌀", w: 44,   convert: "전기 → 운동 에너지" },
    { name: "스피커",        icon: "🔊", w: 800,  convert: "전기 → 소리 에너지" },
    { name: "다리미",        icon: "👔", w: 1000, convert: "전기 → 열에너지" },
    { name: "전기다리미",    icon: "👕", w: 1075, convert: "전기 → 열에너지" },
    { name: "전열기",        icon: "🔥", w: 1200, convert: "전기 → 열에너지" },
    { name: "헤어드라이어",  icon: "💨", w: 1760, convert: "전기 → 열 · 운동 에너지" }
  ];

  /* 가정에서 하루 쓰는 표 — 학습지 【문제】 그대로 (시간은 학생이 바꿀 수 있다) */
  var HOME = [
    { name: "전등",        icon: "🔆", w: 30,   hours: 6,   convert: "전기 → 빛 에너지" },
    { name: "선풍기",      icon: "🌀", w: 40,   hours: 10,  convert: "전기 → 운동 에너지" },
    { name: "다리미",      icon: "👔", w: 1000, hours: 0.5, convert: "전기 → 열에너지" },
    { name: "스피커",      icon: "🔊", w: 800,  hours: 2,   convert: "전기 → 소리 에너지" },
    { name: "배터리충전기", icon: "🔋", w: 6,    hours: 2,   convert: "전기 → 화학 에너지" }
  ];

  function byName(list, n) {
    for (var i = 0; i < list.length; i++) if (list[i].name === n) return list[i];
    return null;
  }

  /* 하루 전력량 합계 (Wh) */
  function totalWh(list) {
    var s = 0;
    for (var i = 0; i < list.length; i++) s += wattHour(list[i].w, list[i].hours);
    return s;
  }

  /* 소비 전력이 큰 것부터 (학습지 물음 2) */
  function byPowerDesc(list) {
    return list.slice().sort(function (a, b) { return b.w - a.w; });
  }

  /* 전력량이 큰 것부터 (학습지 물음 3 에서 이어지는 비교) */
  function byWhDesc(list) {
    return list.slice().sort(function (a, b) {
      return wattHour(b.w, b.hours) - wattHour(a.w, a.hours);
    });
  }

  /* ---------------------------------------------------------
     4. 시간 읽기 좋게 (초 → 시·분·초)
     --------------------------------------------------------- */
  function humanTime(sec) {
    if (!isFinite(sec)) return "∞";
    if (sec < 60) return Math.round(sec * 10) / 10 + " 초";
    if (sec < 3600) {
      var m = Math.floor(sec / 60), s = Math.round(sec - m * 60);
      return m + " 분" + (s ? " " + s + " 초" : "");
    }
    var h = Math.floor(sec / 3600), mm = Math.round((sec - h * 3600) / 60);
    return h + " 시간" + (mm ? " " + mm + " 분" : "");
  }

  global.Power = {
    J_PER_WH: J_PER_WH, STD_VOLT: STD_VOLT,
    APPLIANCES: APPLIANCES, HOME: HOME,
    clamp: clamp,
    energyJ: energyJ, wattHour: wattHour, kWh: kWh, secondsFor: secondsFor,
    jToWh: jToWh, whToJ: whToJ,
    resistance: resistance, powerAt: powerAt, currentAt: currentAt,
    byName: byName, totalWh: totalWh, byPowerDesc: byPowerDesc, byWhDesc: byWhDesc,
    humanTime: humanTime
  };
})(window);
