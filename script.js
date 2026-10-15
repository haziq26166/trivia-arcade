(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const screens = ["home-screen", "quiz-screen", "result-screen", "achievements-screen"];
  const LETTERS = ["A", "B", "C", "D"];
  const STORE = { best: "triviaArcadeBestV1", achievements: "triviaArcadeAchievementsV1", stats: "triviaArcadeStatsV1", sound: "triviaArcadeSoundV1" };
  const ACHIEVEMENTS = [
    {id:"first_run", icon:"🕹", title:"INSERT COIN", description:"Finish your first run.", test:s=>s.games>=1},
    {id:"perfect", icon:"💎", title:"PERFECT RUN", description:"Answer every question correctly in a run.", test:s=>s.lastTotal>0&&s.lastCorrect===s.lastTotal},
    {id:"streak5", icon:"🔥", title:"ON FIRE", description:"Get a 5-answer streak in a run.", test:s=>s.bestStreak>=5},
    {id:"score1000", icon:"⚡", title:"SCORE HUNTER", description:"Earn 1,000 points in one run.", test:s=>s.lastScore>=1000},
    {id:"speedster", icon:"⏱", title:"SPEEDSTER", description:"Answer correctly with 5+ seconds left.", test:s=>s.speedAnswers>=1},
    {id:"collector", icon:"🏆", title:"ARCADE REGULAR", description:"Finish 10 runs.", test:s=>s.games>=10},
    {id:"century", icon:"👾", title:"CENTURY CLUB", description:"Answer 100 questions correctly overall.", test:s=>s.totalCorrect>=100},
    {id:"comeback", icon:"🌟", title:"COMEBACK KID", description:"Score 70% accuracy or higher.", test:s=>s.lastTotal>0&&s.lastCorrect/s.lastTotal>=.7}
  ];
  let questionBank = [], runQuestions = [], index = 0, score = 0, correct = 0, streak = 0, bestStreak = 0;
  let secondsLeft = 15, questionLimit = 0, duration = 15, timerId = null, locked = false, runReview = [], speedAnswers = 0;
  let soundOn = readStore(STORE.sound, true), audioContext = null;

  function readStore(key, fallback) { try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } }
  function writeStore(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing/storage disabled: game still works. */ } }
  function bestScore() { return Number(readStore(STORE.best, 0)) || 0; }
  function getStats() { return Object.assign({games:0,totalCorrect:0,bestStreak:0,lastScore:0,lastCorrect:0,lastTotal:0,speedAnswers:0}, readStore(STORE.stats, {})); }
  function showScreen(id) { screens.forEach(s => $(s).classList.toggle("hidden", s !== id)); window.scrollTo({top:0,behavior:"smooth"}); }
  function pad(n, width=5) { return String(n).padStart(width, "0"); }
  function shuffle(arr) { const a = arr.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

  function beep(freq=440, length=.08, type="square", volume=.035) {
    if (!soundOn) return;
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const osc = audioContext.createOscillator(), gain = audioContext.createGain();
      osc.type=type; osc.frequency.setValueAtTime(freq,audioContext.currentTime);
      gain.gain.setValueAtTime(volume,audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+length);
      osc.connect(gain); gain.connect(audioContext.destination); osc.start(); osc.stop(audioContext.currentTime+length);
    } catch { /* Sound is an optional enhancement. */ }
  }
  function soundCorrect(){beep(660,.08);setTimeout(()=>beep(880,.12),75);}
  function soundWrong(){beep(180,.18,"sawtooth",.025);}
  function soundWin(){[523,659,784,1047].forEach((f,i)=>setTimeout(()=>beep(f,.14),i*100));}
  $("modal-continue-btn").addEventListener("click", () => {
    $("explanation-modal").classList.add("hidden");
    if(index >= runQuestions.length) finishGame();
    else renderQuestion();
  });

  async function loadQuestions() {
    try {
      const response = await fetch("questions.json");
      if (!response.ok) throw new Error("Could not load questions.json");
      questionBank = await response.json();
      if (!Array.isArray(questionBank) || questionBank.length < 10) throw new Error("Question bank is incomplete");
      $("start-btn").disabled = false;
    } catch (err) {
      $("start-btn").disabled = true;
      $("start-btn").textContent = "QUESTION BANK NOT FOUND";
      $("feedback").textContent = "Place questions.json beside index.html.";
      console.error(err);
    }
  }

  function startGame() {
    if (!questionBank.length) return;
    questionLimit = questionBank.length;
    duration = 15;
    runQuestions = shuffle(questionBank).slice(0, questionLimit);
    index=0; score=0; correct=0; streak=0; bestStreak=0; speedAnswers=0; runReview=[];
    $("score").textContent=pad(score); $("streak").textContent="×0";
    showScreen("quiz-screen"); renderQuestion();
  }

  function renderQuestion() {
    clearInterval(timerId); locked=false;
    if(index>=runQuestions.length){finishGame();return;}
    const q=runQuestions[index];
    $("question-number").textContent=String(index+1).padStart(2,"0");
    document.querySelector(".question-count .muted").textContent=" / "+questionLimit;
    $("progress-bar").style.width=(index/questionLimit*100)+"%";
    $("question-text").textContent=q.question;
    $("feedback").textContent="CHOOSE YOUR ANSWER!";
    $("feedback").className="feedback";
    const answerRoot=$("answers"); answerRoot.innerHTML="";
    q.options.forEach((option,i)=>{
      const btn=document.createElement("button");btn.type="button";btn.className="answer-btn";
      const letter=document.createElement("span");letter.className="answer-letter";letter.textContent=LETTERS[i];
      const text=document.createElement("span");text.textContent=option;
      btn.append(letter,text);btn.addEventListener("click",()=>chooseAnswer(i));answerRoot.appendChild(btn);
    });
    secondsLeft=duration;updateTimerUI();timerId=setInterval(tick,1000);
  }
  function updateTimerUI() {
    $("timer-number").textContent=secondsLeft;
    $("timer-number").classList.toggle("urgent",secondsLeft<=5);
    $("timer-bar").style.width=Math.max(0,secondsLeft/duration*100)+"%";
    $("timer-bar").style.background=secondsLeft<=5?"var(--red)":secondsLeft<=8?"var(--yellow)":"var(--green)";
  }
  function tick() {
    if(locked)return;
    secondsLeft=Math.max(0,secondsLeft-1);updateTimerUI();
    if(secondsLeft<=5 && secondsLeft>0) beep(260,.035,"square",.012);
    if(secondsLeft===0) chooseAnswer(-1);
  }
function chooseAnswer(selected) {
    if(locked)return;locked=true;clearInterval(timerId);
    const q=runQuestions[index], isCorrect=selected===q.answer, buttons=[...$("answers").querySelectorAll("button")];
    buttons.forEach((btn,i)=>{btn.disabled=true;if(i===q.answer)btn.classList.add("correct");if(i===selected&&!isCorrect)btn.classList.add("wrong");});
    let gained=0;
    
    if(isCorrect) {
      correct++;streak++;bestStreak=Math.max(bestStreak,streak);
      const speedBonus=secondsLeft*5, streakBonus=Math.max(0,streak-1)*20;
      gained=100+speedBonus+streakBonus;score+=gained;
      if(secondsLeft>=5)speedAnswers++;
      $("feedback").textContent="CORRECT! +"+gained+" POINTS";$("feedback").className="feedback good";soundCorrect();
      
      $("score").textContent=pad(score);$("streak").textContent="×"+streak;
      runReview.push({q,selected,isCorrect,gained});
      index++;
      // Proceed normally after a short delay for correct answers
      setTimeout(()=>{if(index>=runQuestions.length)finishGame();else renderQuestion();},1050);
      
    } else {
      streak=0;
      $("feedback").textContent=selected===-1?"TIME'S UP!":"NOPE! THE ANSWER WAS "+LETTERS[q.answer];$("feedback").className="feedback bad";soundWrong();
      $("score").textContent=pad(score);$("streak").textContent="×"+streak;
      runReview.push({q,selected,isCorrect,gained});
      index++;
      
      // Delay slightly, then show the custom retro modal
      setTimeout(()=>{
        // Safely removes any tags from the explanation
        const cleanExplanation = q.explanation.replace(new RegExp("\\[cite: [0-9]+\\]", "g"), "").trim();
        $("modal-explanation").textContent = cleanExplanation;
        $("explanation-modal").classList.remove("hidden");
      }, 700);
    }
  }

  function finishGame() {
    clearInterval(timerId);
    const oldBest=bestScore(), isNew=score>oldBest;
    if(isNew)writeStore(STORE.best,score);
    const stats=getStats();
    stats.games++;stats.totalCorrect+=correct;stats.bestStreak=Math.max(stats.bestStreak,bestStreak);
    stats.lastScore=score;stats.lastCorrect=correct;stats.lastTotal=questionLimit;stats.speedAnswers+=speedAnswers;
    writeStore(STORE.stats,stats);
    const oldAchievements=readStore(STORE.achievements,[]);
    const unlocked=ACHIEVEMENTS.filter(a=>a.test(stats)).map(a=>a.id);
    const newly=unlocked.filter(id=>!oldAchievements.includes(id));
    writeStore(STORE.achievements,[...new Set([...oldAchievements,...unlocked])]);
    $("top-best").textContent=pad(Math.max(oldBest,score));
    $("final-score").textContent=pad(score);
    $("accuracy").textContent=Math.round(correct/questionLimit*100)+"%";
    $("correct-count").textContent=correct+"/"+questionLimit;
    $("best-streak").textContent=bestStreak;
    $("new-best").classList.toggle("hidden",!isNew);
    $("result-title").textContent=correct===questionLimit?"PERFECT RUN!":correct/questionLimit>=.7?"NICE RUN!":correct/questionLimit>=.4?"KEEP PRACTICING!":"GAME OVER!";
    $("result-message").textContent=newly.length?"ACHIEVEMENT UNLOCKED! KEEP IT UP.":"YOU GOT "+correct+" OUT OF "+questionLimit+" RIGHT.";
    $("result-medal").textContent=correct===questionLimit?"♛":correct/questionLimit>=.7?"★":correct/questionLimit>=.4?"✦":"◆";
    const review=$("review-list");review.innerHTML="";
    runReview.forEach((item,i)=>{
      const row=document.createElement("div");row.className="review-item";
      const title=document.createElement("strong");title.textContent=String(i+1).padStart(2,"0")+". "+item.q.question;
      const answer=document.createElement("p");answer.textContent="ANSWER: "+item.q.options[item.q.answer];
      const result=document.createElement("p");result.className="review-result "+(item.isCorrect?"good":"bad");result.textContent=(item.isCorrect?"✓ CORRECT":"✗ "+(item.selected===-1?"TIME OUT":"YOUR ANSWER: "+item.q.options[item.selected]))+" — "+item.q.explanation;
      row.append(title,answer,result);review.appendChild(row);
    });
    showScreen("result-screen");if(correct/questionLimit>=.7)soundWin();
  }

  function renderAchievements() {
    const unlocked=readStore(STORE.achievements,[]),root=$("achievement-list");root.innerHTML="";
    ACHIEVEMENTS.forEach(a=>{
      const card=document.createElement("div");card.className="achievement"+(unlocked.includes(a.id)?" unlocked":"");
      const icon=document.createElement("span");icon.className="achievement-icon";icon.textContent=unlocked.includes(a.id)?a.icon:"🔒";
      const info=document.createElement("div"),title=document.createElement("strong"),desc=document.createElement("p");
      title.textContent=a.title;desc.textContent=a.description;info.append(title,desc);card.append(icon,info);root.appendChild(card);
    });
  }
  $("start-btn").addEventListener("click",startGame);
  $("again-btn").addEventListener("click",startGame);
  $("home-btn").addEventListener("click",()=>showScreen("home-screen"));
  $("quit-btn").addEventListener("click",()=>{clearInterval(timerId);showScreen("home-screen");});
  $("sound-toggle").addEventListener("click",()=>{
    soundOn=!soundOn;writeStore(STORE.sound,soundOn);
    $("sound-toggle").textContent=soundOn?"♫ SOUND ON":"♫ SOUND OFF";
    $("sound-toggle").setAttribute("aria-pressed",String(soundOn));if(soundOn)beep(700,.08);
  });
  const achButton=document.createElement("button");achButton.className="pixel-btn secondary-btn";achButton.textContent="★ ACHIEVEMENTS";achButton.style.marginTop="14px";achButton.addEventListener("click",()=>{renderAchievements();showScreen("achievements-screen");});
  $("start-btn").parentElement.appendChild(achButton);
  $("achievements-home-btn").addEventListener("click",()=>showScreen("home-screen"));
  $("top-best").textContent=pad(bestScore());
  $("sound-toggle").textContent=soundOn?"♫ SOUND ON":"♫ SOUND OFF";
  $("sound-toggle").setAttribute("aria-pressed",String(soundOn));
  loadQuestions();
})();