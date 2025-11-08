// script.js — фикс для мобильной подгрузки (точечные изменения, сохраняют логику)

const txtbet = document.querySelector('#bet');
const elwin = document.querySelector('#el-win');
const txtwin = document.querySelector('#win');
const elmoney = document.querySelector('#el-money');
const txtmoney = document.querySelector('#money');
const elgame = document.querySelector('#game-area');
const btnbet = document.querySelector('#btn-bet');
const btnspin = document.querySelector('#btn-spin');
const btnputmn = document.querySelector('#btn-putmoney');

// локалсторедж баланс
let money = Number(localStorage.getItem('money')) || 0;
function updateMoney(value){
  money = value;
  localStorage.setItem('money', money);
  txtmoney.innerHTML = money;
}

// трек, было ли взаимодействие пользователя (нужно для автоплея со звуком)
let userInteracted = false;
function setUserInteracted(){ userInteracted = true; }
document.addEventListener('click', setUserInteracted, {once: true, passive:true});

// стартовый флаг игры (чтобы startGame вызывался один раз)
let gameStarted = false;

// базовые переменные
let bet = 1;
let betstep = 0;
const betarr = [1,3,5,10,20,30,50,100,200,500,1000,2000,5000,10000,20000,50000,100000,200000,500000,1000000];
const arr = ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🍒','🥭','🥝'];
const NUM_THUMBS = 12; // 0..11

const cols = document.querySelectorAll('.column');
const col1 = cols[0], col2 = cols[1], col3 = cols[2], col4 = cols[3], col5 = cols[4];

// Создаём слот-item через DOM (без innerHTML) — надёжнее на мобилках
function createSlotItem(i){
  const div = document.createElement('div');
  div.className = 'slot-item';
  div.dataset.ind = i;

  // сохраняем стиль position:relative для корректного absolute-видео (если нужно)
  // div.style.position = 'relative';

  const img = document.createElement('img');
  img.className = 'slot-thumb';
  img.src = `media/thumbs/v${i}.jpg`;
  img.alt = `slot ${i}`;
  img.onerror = function(){
    this.onerror = null;
    this.src = 'media/thumbs/default.jpg';
  };

  div.appendChild(img);
  return div;
}

// случайный индекс (0..NUM_THUMBS-1)
function getRandomInt(){
  return Math.floor(Math.random() * NUM_THUMBS);
}

// добавление n элементов в колонку (использует createSlotItem)
function addItems(el, n){
  for(let k=0;k<n;k++){
    const ind = getRandomInt();
    const slot = createSlotItem(ind);
    el.prepend(slot);
  }
}

// replaceWithVideo: аккуратно добавляет video в слот и показывает его лишь после готовности
// возвращает Promise, который резолвится видео-элементом или null при ошибке
function replaceWithVideo(el, i){
  return new Promise((resolve)=>{
    // если уже есть видео — используем его (и проверяем poster)
    const existing = el.querySelector('video.slot-video');
    if(existing){
      const poster = existing.getAttribute('poster') || '';
      if(poster.indexOf(`v${i}.jpg`) !== -1){
        resolve(existing);
        return;
      } else {
        try{ existing.remove(); }catch(e){}
      }
    }

    // создаём video, но скрываем пока не готов
    const vid = document.createElement('video');
    vid.className = 'slot-video';
    vid.setAttribute('playsinline','');
    vid.loop = true;
    vid.preload = 'auto';
    vid.poster = `media/thumbs/v${i}.jpg`;
    vid.style.opacity = 0;
    vid.style.transition = 'opacity 220ms ease';
    // ставим muted true для уверенного автоплея; потом попробуем снять, если allowed
    vid.muted = true;

    const s1 = document.createElement('source');
    s1.src = `media/v${i}.webm`;
    s1.type = 'video/webm';
    const s2 = document.createElement('source');
    s2.src = `media/v${i}.mp4`;
    s2.type = 'video/mp4';

    vid.appendChild(s1);
    vid.appendChild(s2);

    // вставляем в DOM рядом с превью — НЕ убираем IMG
    el.appendChild(vid);

    let resolved = false;
    function finishSuccess(){
      if(resolved) return;
      resolved = true;
      resolve(vid);
    }
    function finishFail(){
      if(resolved) return;
      resolved = true;
      // если не удалось — оставляем превью, удаляем видео и возвращаем null
      try{ vid.remove(); }catch(e){}
      resolve(null);
    }

    // события готовности
    const onCan = () => { finishSuccess(); cleanup(); };
    const onLoaded = () => { finishSuccess(); cleanup(); };
    const onErr = () => { finishFail(); cleanup(); };

    function cleanup(){
      vid.removeEventListener('canplaythrough', onCan);
      vid.removeEventListener('loadeddata', onLoaded);
      vid.removeEventListener('error', onErr);
    }

    vid.addEventListener('canplaythrough', onCan, {once:true});
    vid.addEventListener('loadeddata', onLoaded, {once:true});
    vid.addEventListener('error', onErr, {once:true});

    try{ vid.load(); }catch(e){ /* ignore */ }
  });
}

// ПРЕДЗАГРУЗКА (вызвать при первом user gesture, чтобы моб.браузеры не блокировали)
let videosWarmed = false;
function warmupPreloadAllVideos(count = NUM_THUMBS){
  // ставим только <link rel=preload> — лёгкая подсказка браузеру
  for(let i=0;i<count;i++){
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'video';
    link.href = `media/v${i}.mp4`;
    link.type = 'video/mp4';
    document.head.appendChild(link);
  }
  // небольшая fetch-опция: выполняем только если есть уже interaction (to avoid mobile blocking)
  if(userInteracted){
    for(let i=0;i<count;i++){
      fetch(`media/v${i}.mp4`, {method:'GET', cache:'force-cache'}).catch(()=>{});
    }
  }
  videosWarmed = true;
}

// Put Money — корректный обработчик (всегда пополняет при <=0, стартует игру единожды)
btnputmn.addEventListener('click', ()=>{
  if(money <= 0){
    updateMoney(1000000);
    elmoney.classList.remove('col-red');
  }
  if(!gameStarted){
    gameStarted = true;
    // отмечаем, что пользователь взаимодействовал — можно прогреть видео
    userInteracted = true;
    warmupPreloadAllVideos(); // запускаем warmup сразу после явного клика пользователя
    startGame();
  }
}, false);

// Основная функция старта (как раньше, но с улучшениями)
function startGame(){
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
    if(betstep < betarr.length) bet = betarr[betstep];
    else { betstep = 0; bet = betarr[betstep]; }
    txtbet.innerHTML = bet;
    elmoney.classList.remove('col-red');
  }
  btnbet.addEventListener('click', setBet, false);

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
    if(money > 0 && money >= bet) return true;
    elmoney.classList.add('col-red');
    audioOver.play().catch(()=>{});
    return false;
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

  // Плавная подмена видео в центральной линии
  function playCenterVideosWithSound(){
    for(const c of cols){
      const items = c.querySelectorAll('.slot-item');
      if(items.length > 1){
        const el = items[1];
        const i = Number(el.dataset.ind);

        // начинаем замену (замена не трогает img до момента готовности)
        replaceWithVideo(el, i).then((vid)=>{
          if(!vid) return;
          // пробуем play со звуком, иначе play в muted
          vid.muted = false;
          vid.currentTime = 0;
          vid.play().then(()=> {
            // если удалось — делаем fade-in: сначала показываем video и скрываем img
            const img = el.querySelector('img.slot-thumb');
            if(img) img.style.display = 'none';
            vid.style.opacity = 1;
          }).catch(()=> {
            // если автоплей со звуком блокирован — play muted, оставляем звук выключенным
            vid.muted = true;
            vid.play().catch(()=>{});
            const img = el.querySelector('img.slot-thumb');
            if(img) img.style.display = 'none';
            vid.style.opacity = 1;
          });
        });
      }
    }
  }

  function Spin(){
    if(!checkMoney()) return;
    audioSpin.play().catch(()=>{});
    // фикс: помечаем взаимодействие и прогреваем видео при первом клике
    userInteracted = true;
    if(!videosWarmed) warmupPreloadAllVideos();

    updateMoney(money - bet); // списываем ставку
    showMoney();
    disableBtns();
    pauseAllVideos();
    getColumns();

    // запускаем анимацию колонок
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

      // удаляем лишние элементы в обратном порядке (меньше перерисовок)
      for(const c of cols){
        const ditm = c.querySelectorAll('.slot-item');
        for(let i=ditm.length-1;i>=3;i--){
          ditm[i].remove();
        }
        c.style.transition = '0s';
        c.style.bottom = '0px';
      }

      // небольшая задержка для стабилизации рендера на мобильных
      setTimeout(()=> playCenterVideosWithSound(), 40);
    };
  }
  btnspin.addEventListener('click', Spin, false);

  // checkWin оставляем почти без изменений, только updateMoney при выигрыше
  function checkWin(){
    const arrLine1 = [], arrLine2 = [], arrLine3 = [];
    for(const c of cols){
      const d = c.querySelectorAll('.slot-item');
      arrLine1.push(+d[0].dataset.ind);
      arrLine2.push(+d[1].dataset.ind);
      arrLine3.push(+d[2].dataset.ind);
    }

    function copiesArr(a, copies){
      const map = new Map();
      for(const e of a) map.set(e, (map.get(e)||0)+1);
      const res = [];
      for(const [e,cnt] of map.entries()) if(cnt >= copies) res.push(e+':'+cnt);
      return res;
    }

    function getCountCopies(arr){
      return Number(arr[0].split(':')[1]);
    }

    function setBG(arr,row){
      const [indStr] = arr[0].split(':');
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
      updateMoney(money + win);
      showWin(win);
    }else{
      enableBtns();
    }
  }
} // end startGame

// если уже есть баланс на старте — можно автоматически запустить игру (опционально)
// if(money > 0 && !gameStarted){ gameStarted = true; startGame(); }
