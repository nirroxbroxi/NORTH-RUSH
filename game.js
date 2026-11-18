(() => {
  const $ = id => document.getElementById(id);
  let save = JSON.parse(localStorage.getItem('north_rush_save') || JSON.stringify({
    coins: 500, xp: 0, skin: 'frost', cape: 'none', mode: 'classic',
    user: { name: 'Joueur', loggedAdmin: false }, scores: [], owned: ['frost']
  }));

  function persist() { localStorage.setItem('north_rush_save', JSON.stringify(save)); }
  function updateUI() { document.querySelectorAll('[data-balance]').forEach(el => el.textContent = save.coins); }

  // Système de connexion Admin sécurisé
  window.checkAdminLogin = function(username, password) {
    if ((username === 'Nirrox' || username === 'Jibier') && password === 'Giuliano2013') {
      save.user.name = username;
      save.user.loggedAdmin = true;
      if (!save.owned.includes('admin_skin')) save.owned.push('admin_skin');
      save.skin = 'admin_skin';
      save.cape = 'admin_cape';
      persist();
      alert('Connexion Admin réussie ! Skin et Cape Admin débloqués.');
      closeDialog();
    } else {
      alert('Identifiants ou mot de passe incorrects.');
    }
  };

  window.deleteScore = function(index) {
    if(!save.user.loggedAdmin) return;
    save.scores.splice(index, 1);
    persist();
    openDialog('scores');
  };

  // Gestion des dialogues et modérations
  function openDialog(type) {
    $('dialog-layer').hidden = false;
    let title = '', html = '';
    if (type === 'profile') {
      title = 'PROFIL & CONNEXION ADMIN';
      html = `
        <div>Statut : ${save.user.loggedAdmin ? '<span class="admin-badge">ADMINISTRATEUR</span>' : 'Joueur Standard'} (${save.user.name})</div>
        ${!save.user.loggedAdmin ? `
          <div style="margin-top:20px">
            <h3>Connexion Testeur / Admin</h3>
            <label>Pseudo (Nirrox / Jibier) :</label>
            <input type="text" id="adm-user" placeholder="Pseudo">
            <label>Mot de passe :</label>
            <input type="password" id="adm-pass" placeholder="Mot de passe">
            <button class="primary-button" id="btn-login-admin">Se connecter en Admin</button>
          </div>
        ` : `<div style="margin-top:20px;color:var(--lime)">Vous êtes connecté en tant qu'Administrateur avec tous les privilèges !</div>`}
      `;
    } else if (type === 'scores') {
      title = 'CLASSEMENT & MODÉRATION';
      html = `<div>${save.scores.length ? save.scores.map((s, i) => `<div>#${i+1} - ${s.score} pts (${s.mode}) ${save.user.loggedAdmin ? `<button onclick="deleteScore(${i})" style="color:red;background:none;border:none;cursor:pointer">Supprimer</button>` : ''}</div>`).join('') : 'Aucun score enregistré.'}</div>`;
    } else if (type === 'shop') {
      title = 'BOUTIQUE';
      html = `<div>Skins & Capes disponibles. (Le coffre méga-rare en jeu débloque tout gratuitement !).</div>`;
    } else if (type === 'pass') {
      title = 'PASSE DE COMBAT (3 PAGES)';
      html = `<div>Paliers 1 à 30 disponibles.</div>`;
    }
    $('dialog-title').textContent = title;
    $('dialog-body').innerHTML = html;

    if($('btn-login-admin')) {
      $('btn-login-admin').onclick = () => {
        checkAdminLogin($('adm-user').value.trim(), $('adm-pass').value.trim());
      };
    }
  }
  function closeDialog() { $('dialog-layer').hidden = true; }

  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openDialog(b.dataset.open)));
  $('dialog-close').onclick = closeDialog;

  // Bascule de mode
  $('btn-mode-classic').onclick = () => { save.mode = 'classic'; $('btn-mode-classic').classList.add('active'); $('btn-mode-lava').classList.remove('active'); persist(); };
  $('btn-mode-lava').onclick = () => { save.mode = 'lava'; $('btn-mode-lava').classList.add('active'); $('btn-mode-classic').classList.remove('active'); persist(); };

  // Moteur 3D Three.js
  let scene, camera, renderer, player, gameActive = false, score = 0;
  const LANES = [-3, 0, 3];

  function init3D() {
    renderer = new THREE.WebGLRenderer({ canvas: $('world'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 4, 12);

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const geom = new THREE.BoxGeometry(0.8, 1.8, 0.8);
    const mat = new THREE.MeshStandardMaterial({ color: save.user.loggedAdmin ? 0xffd700 : 0x00ffcc });
    player = new THREE.Mesh(geom, mat);
    player.position.set(0, 0.9, 5);
    scene.add(player);

    updateEnvironmentTheme();
  }

  function updateEnvironmentTheme() {
    if (save.mode === 'lava') {
      scene.background = new THREE.Color(0x3a0505);
      if(window.lavaMesh) scene.remove(window.lavaMesh);
      const lavaGeo = new THREE.PlaneGeometry(100, 300);
      const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
      window.lavaMesh = new THREE.Mesh(lavaGeo, lavaMat);
      window.lavaMesh.rotation.x = -Math.PI / 2;
      window.lavaMesh.position.y = -0.5;
      window.lavaMesh.position.z = -100;
      scene.add(window.lavaMesh);
    } else {
      scene.background = new THREE.Color(0x0f253e);
      if(window.lavaMesh) scene.remove(window.lavaMesh);
    }
  }

  function startGame() {
    $('home-screen').hidden = true;
    $('run-hud').hidden = false;
    score = 0;
    gameActive = true;
    updateEnvironmentTheme();
    $('hud-mode-label').textContent = save.mode === 'lava' ? '🌋 FLOOR IS LAVA (Pas de sol !)' : '❄️ CLASSIQUE';
  }

  $('start-button').onclick = startGame;
  $('restart-button').onclick = () => { $('over-screen').hidden = true; startGame(); };

  let currentLane = 1;
  window.addEventListener('keydown', e => {
    if (!gameActive) return;
    if ((e.key === 'ArrowLeft' || e.key === 'q') && currentLane > 0) currentLane--;
    if ((e.key === 'ArrowRight' || e.key === 'd') && currentLane < 2) currentLane++;
    player.position.x = LANES[currentLane];
  });

  init3D();
  updateUI();
  renderer.setAnimationLoop(() => {
    if (gameActive) {
      score += 10;
      $('score').textContent = String(score).padStart(5, '0');
    }
    renderer.render(scene, camera);
  });
})();
