// script.js — версия с JPG-превью и видео на центральной линии

const txtbet = document.querySelector('#bet');
const elwin = document.querySelector('#el-win');
const txtwin = document.querySelector('#win');
const elmoney = document.querySelector('#el-money');
const txtmoney = document.querySelector('#money');
const elgame = document.querySelector('#game-area');
const btnbet = document.querySelector('#btn-bet');
const btnspin = document.querySelector('#btn-spin');
const btnputmn = document.querySelector('#btn-putmoney');

let money = 0;
let bet = 1;
let betstep = 0;
const betarr = [1,3,5,10,20,30,50,100,200,500,1000,2000,5000,10000,20000,50000,100000,200000,500000,1000000];
const arr = ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍒','🥭','🥝'];

const cols = document.querySelectorAll('.column');
const col1 = cols[0];
const col2 = cols[1];
const col3 = cols[2];
const col4 = cols[3];
const col5 = cols[4];

// 🔹 Создаём элемент слота с картинкой-превью
function getItemHTML(i){
  return `
    <div class="slot-item" data-ind="${i}">
      <img class="slot-thumb" src="media/thumbs/v${i}.jpg" alt="slot ${i}">
    </div>`;
}

// 🔹 Функция для вставки видео вместо картинки (используется только в центре)
function replaceWithVideo(el, i){
  el.innerHTML = `
    <video class="slot-video" playsinline muted loop autoplay preload="auto" poster="media/thumbs/v${i}.jpg">
      <source src="media/v${i}.webm" type="video/webm">
      <source src="media/v${i}.mp4" type="video/mp4">
    </video>`;
}



btnputmn.addEventListener('click', ()=>{
  if(money === 0){
    money = 1000000;
    elmoney.classList.remove('col-red');
    startGame();
  }
}, false);

function startGame(){
const videoCache = []; // кэш для видео

function warmupPreloadAllVideos(count = 12){
  for(let i = 0; i < count; i++){
    // mp4 чаще оптимально; можно делать и webm
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'video';
    link.href = `media/v${i}.mp4`; // можно поставить .webm если он меньше
    link.type = 'video/mp4';
    document.head.appendChild(link);

    // дополнительные попытки прогреть кеш через fetch (необязательно)
    fetch(link.href, { method: 'GET', cache: 'force-cache' }).catch(()=>{});
  }
}


  function showMoney(){
    elwin.style.display = 'none';
    elmoney.style.display = '';
    txtmoney.innerHTML = money;
  }
  showMoney();

  function showWin(w){
    elmoney.style.display = 'none';
    elwin.style.display = '';
    txtwin.innerHTML = w;
    const gameWrap = document.querySelector('.c-game');
    if (gameWrap) gameWrap.classList.add('win-effect');
    spawnConfetti(28);
    setTimeout(()=>{
      if (gameWrap) gameWrap.classList.remove('win-effect');
      showMoney();
      enableBtns();
    }, 2000);
  }

  const audioCash = new Audio('media/cash.mp3');
  const audioClick = new Audio('media/click.mp3');
  const audioSpin = new Audio('media/spin.mp3');
  const audioWin = new Audio('media/win.mp3');
  const audioOver = new Audio('media/over.mp3');
  audioCash.play().catch(()=>{});

  function setBet(){
    audioClick.play().catch(()=>{});
    betstep++;
    if(betstep < betarr.length){
      bet = betarr[betstep];
    }else{
      betstep = 0;
      bet = betarr[betstep];
    }
    txtbet.innerHTML = bet;
    elmoney.classList.remove('col-red');
  }
  btnbet.addEventListener('click', setBet, false);

  function getRandomInt(){
    return Math.floor(Math.random() * arr.length);
  }

  function addItems(el, n){
    for(let i=0;i<n;i++){
      const ind = getRandomInt();
      const d = document.createElement('div');
      d.setAttribute('data-ind', ind);
      d.innerHTML = getItemHTML(ind);
      el.prepend(d.firstElementChild);
    }
  }

  function getColumns(){
    addItems(col1,10);
    addItems(col2,20);
    addItems(col3,30);
    addItems(col4,40);
    addItems(col5,50);
  }

  function getStartItems(){
    for(const c of cols) addItems(c,3);
  }
  getStartItems();

  function spawnConfetti(count = 20){
    const area = document.querySelector('#game-area');
    if(!area) return;
    const cont = document.createElement('div');
    cont.className = 'confetti-container';
    cont.style.position = 'absolute';
    cont.style.left = '0';
    cont.style.top = '0';
    cont.style.width = '100%';
    cont.style.height = '100%';
    cont.style.pointerEvents = 'none';
    area.appendChild(cont);
    for(let i=0;i<count;i++){
      const el = document.createElement('div');
      el.className = 'confetti';
      el.style.left = Math.random() * 90 + '%';
      el.style.top = Math.random() * 10 + '%';
      el.style.transform = `rotate(${Math.random()*360}deg)`;
      const colors = ['var(--accent1)', 'var(--accent2)', 'var(--accent3)', '#fff'];
      el.style.background = colors[Math.floor(Math.random()*colors.length)];
      cont.appendChild(el);
    }
    setTimeout(()=>cont.remove(), 2200);
  }

  function checkMoney(){
    if(money > 0 && money >= bet){
      return true;
    } else {
      elmoney.classList.add('col-red');
      audioOver.play().catch(()=>{});
      return false;
    }
  }

  function disableBtns(){
    btnbet.setAttribute('disabled','1');
    btnspin.setAttribute('disabled','1');
  }
  function enableBtns(){
    btnbet.removeAttribute('disabled');
    btnspin.removeAttribute('disabled');
  }

  function pauseAllVideos(){
    document.querySelectorAll('.slot-video').forEach(v=>{
      try{ v.pause(); }catch(e){}
    });
  }

  function playCenterVideosWithSound(){
    for(const c of cols){
      const items = c.querySelectorAll('.slot-item');
      if(items.length > 1){
        const el = items[1];
        const i = el.dataset.ind;
        // заменяем обложку на видео
        replaceWithVideo(el, i);
        const vid = el.querySelector('video');
        if(vid){
          vid.muted = false;
          vid.currentTime = 0;
          vid.play().catch(()=>{});
        }
      }
    }
  }

  function Spin(){
    if(!checkMoney()) return;
    audioSpin.play().catch(()=>{});
    money -= bet;
    showMoney();
    disableBtns();
    pauseAllVideos();
    getColumns();

    let tr = 1;
    for(const c of cols){
      c.style.transition = `${tr}s ease-out`;
      const n = c.querySelectorAll('.slot-item').length;
      const b = (n - 3) * 160;
      c.style.bottom = `-${b}px`;
      tr += 0.5;
    }

    col5.ontransitionend = ()=>{
      checkWin();

      for(const c of cols){
        const ditm = c.querySelectorAll('.slot-item');
        for(let i=0;i<ditm.length;i++){
          if(i>=3) ditm[i].remove();
        }
        c.style.transition = '0s';
        c.style.bottom = '0px';
      }
      playCenterVideosWithSound();
    };
  }
  btnspin.addEventListener('click', Spin, false);

  function checkWin(){
    const arrLine1 = [], arrLine2 = [], arrLine3 = [];
    for(const c of cols){
      const d = c.querySelectorAll('.slot-item');
      arrLine1.push(+d[0].dataset.ind);
      arrLine2.push(+d[1].dataset.ind);
      arrLine3.push(+d[2].dataset.ind);
    }

    function copiesArr(arr, copies){
      const map = new Map();
      for(const e of arr){
        map.set(e, (map.get(e)||0)+1);
      }
      const res = [];
      for(const [e,cnt] of map.entries())
        if(cnt >= copies) res.push(e+':'+cnt);
      return res;
    }

    function getCountCopies(arr){
      return Number(arr[0].split(':')[1]);
    }

    function setBG(arr,row){
      const [indStr, cntStr] = arr[0].split(':');
      const ind = indStr;
      for(const c of cols){
        const bitem = c.querySelectorAll('.slot-item')[row];
        if(bitem.dataset.ind == ind){
          bitem.classList.add('bg');
          const v = bitem.querySelector('video');
          if(v){
            v.currentTime = 0;
            v.muted = false;
            v.play().catch(()=>{});
          }
        }
      }
    }

    let stopspin = false;
    let resL1=0, resL2=0, resL3=0;
    const arrC1 = copiesArr(arrLine1, 3);
    const arrC2 = copiesArr(arrLine2, 3);
    const arrC3 = copiesArr(arrLine3, 3);

    if(arrC1.length){
      stopspin = true;
      const cnt = getCountCopies(arrC1);
      setBG(arrC1,0);
      if(cnt==3) resL1 = 2*bet;
      if(cnt==4) resL1 = 5*bet;
      if(cnt==5) resL1 = 10*bet;
    }
    if(arrC2.length){
      stopspin = true;
      const cnt = getCountCopies(arrC2);
      setBG(arrC2,1);
      if(cnt==3) resL2 = 100*bet;
      if(cnt==4) resL2 = 1000*bet;
      if(cnt==5) resL2 = 100000*bet;
    }
    if(arrC3.length){
      stopspin = true;
      const cnt = getCountCopies(arrC3);
      setBG(arrC3,2);
      if(cnt==3) resL3 = 2*bet;
      if(cnt==4) resL3 = 5*bet;
      if(cnt==5) resL3 = 10*bet;
    }

    if(stopspin){
      audioWin.play().catch(()=>{});
      const win = resL1 + resL2 + resL3;
      showWin(win);
      money += win;
    }else{
      enableBtns();
    }
  }
}
