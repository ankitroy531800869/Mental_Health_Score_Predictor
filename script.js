const API_BASE = "https://mental-health-score-predictor-h9ak.onrender.com";

const $ = id => document.getElementById(id);
const form = $("form"), result = $("result"), arc = $("arc");
const CIRC = 439.8;

document.querySelectorAll("input[type=range]").forEach(r => {
  const out = document.querySelector(`[data-for="${r.id}"]`);
  const sync = () => out.textContent = `${r.value} h`;
  r.addEventListener("input", sync); sync();
});

function levelFor(s){
  if (s >= 7) return {c:"var(--high)", t:"Looking healthy", m:"Your habits point to a good mental health score. Keep your routine steady."};
  if (s >= 5) return {c:"var(--mid)",  t:"Moderate", m:"There is room to improve. Sleep, activity and screen time are the easiest levers."};
  return {c:"var(--low)", t:"Needs attention", m:"Your inputs suggest a lower score. Consider cutting screen time and talking to someone."};
}

function setState(state){
  result.classList.remove("loading","error");
  if (state) result.classList.add(state);
}

function countUp(to){
  const start = performance.now(), dur = 1200;
  (function tick(now){
    const p = Math.min((now - start) / dur, 1), e = 1 - Math.pow(1 - p, 3);
    $("score").textContent = (to * e).toFixed(1);
    if (p < 1) requestAnimationFrame(tick); else $("score").textContent = to.toFixed(2);
  })(start);
}

function showResult(score){
  const lv = levelFor(score);
  setState(null);
  arc.style.stroke = lv.c;
  arc.style.strokeDasharray = CIRC;
  arc.style.strokeDashoffset = CIRC * (1 - Math.min(Math.max(score / 10, 0), 1));
  $("verdict").textContent = lv.t;
  $("msg").textContent = lv.m;
  result.classList.add("pop");
  setTimeout(() => result.classList.remove("pop"), 600);
  countUp(score);
}

function showError(text){
  setState("error");
  arc.style.strokeDasharray = CIRC; arc.style.strokeDashoffset = CIRC;
  $("score").textContent = "!";
  $("verdict").textContent = "Prediction failed";
  $("msg").textContent = text;
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  if (!form.checkValidity()) { form.reportValidity(); return; }

  const f = new FormData(form);
  const payload = {
    age: parseInt(f.get("age"), 10),
    gender: f.get("gender"),
    country: f.get("country").trim(),
    academic_level: f.get("academic_level"),
    most_used_platform: f.get("most_used_platform"),
    purpose_of_use: f.get("purpose_of_use"),
    avg_daily_usage_hours: parseFloat(f.get("avg_daily_usage_hours")),
    daily_unlocks: parseInt(f.get("daily_unlocks"), 10),
    study_hours: parseFloat(f.get("study_hours")),
    physical_activity_hours: parseFloat(f.get("physical_activity_hours")),
    sleep_hours_per_night: parseFloat(f.get("sleep_hours_per_night")),
    stress_level: f.get("stress_level")
  };

  setState("loading");
  arc.style.stroke = "var(--accent)";
  $("verdict").textContent = "Analysing your inputs…";
  $("msg").textContent = "The model is working on your score.";
  $("submit").disabled = true; $("submit").classList.add("loading"); $("btn-text").textContent = "Predicting…";
  if (window.matchMedia("(max-width:860px)").matches) result.scrollIntoView({behavior:"smooth", block:"center"});

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      let detail = `Server returned ${res.status}.`;
      try {
        const err = await res.json();
        if (Array.isArray(err.detail)) detail = err.detail.map(d => `${d.loc.slice(-1)[0]}: ${d.msg}`).join("; ");
        else if (err.detail) detail = err.detail;
      } catch {}
      throw new Error(detail);
    }
    const data = await res.json();
    showResult(data.predicted_mental_health_score);
  } catch (err) {
    const offline = err instanceof TypeError;
    showError(offline ? "Can’t reach the API. Check that uvicorn is running on port 2200 and that API_BASE uses http://." : err.message);
  } finally {
    $("submit").disabled = false; $("submit").classList.remove("loading"); $("btn-text").textContent = "Predict score";
  }
});