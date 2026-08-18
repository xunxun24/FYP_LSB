/**
 * FYP Application Controller - UI Events, AI Vision Detection, Canvas Processing, & Bit Inspector
 */

document.addEventListener('DOMContentLoaded', () => {

  // State Management
  const state = {
    encImage: null,
    encMode: 'lsb',
    encScope: 'full', // 'full' | 'person' | 'face' | 'all'
    detectedPersons: [], // [{ x, y, width, height, score, label }]
    detectedFaces: [],   // [{ x, y, width, height, score, label }]
    isAiDetecting: false,
    aiModelsLoaded: false,
    decImage: null,
    decMode: 'lsb',
    stegoCover: null,
    stegoStego: null,
    inspImage: null,
    inspPixelVal: 161
  };

  // Cache DOM Elements
  const DOM = {
    tabs: document.querySelectorAll('.nav-tab'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    
    // Encrypt Tab
    encDropZone: document.getElementById('enc-drop-zone'),
    encFileInput: document.getElementById('enc-file-input'),
    aiStatusBadge: document.getElementById('ai-status-badge'),
    btnScopeFull: document.getElementById('btn-scope-full'),
    btnScopePerson: document.getElementById('btn-scope-person'),
    btnScopeFace: document.getElementById('btn-scope-face'),
    btnScopeAll: document.getElementById('btn-scope-all'),
    subPersonCount: document.getElementById('sub-person-count'),
    subFaceCount: document.getElementById('sub-face-count'),
    subAllCount: document.getElementById('sub-all-count'),
    aiDetectionBanner: document.getElementById('ai-detection-banner'),
    aiDetectionText: document.getElementById('ai-detection-text'),
    modeCardLsb: document.getElementById('mode-card-lsb'),
    modeCardMsb: document.getElementById('mode-card-msb'),
    encPassword: document.getElementById('enc-password'),
    toggleEncPwd: document.getElementById('toggle-enc-pwd'),
    btnProcessEncrypt: document.getElementById('btn-process-encrypt'),
    canvasEncOrig: document.getElementById('canvas-enc-orig'),
    canvasEncResult: document.getElementById('canvas-enc-result'),
    phEncOrig: document.getElementById('ph-enc-orig'),
    phEncResult: document.getElementById('ph-enc-result'),
    encMetrics: document.getElementById('enc-metrics'),
    valEncMse: document.getElementById('val-enc-mse'),
    valEncPsnr: document.getElementById('val-enc-psnr'),
    valEncSwapped: document.getElementById('val-enc-swapped'),
    encExportFormat: document.getElementById('enc-export-format'),
    encQuality: document.getElementById('enc-quality'),
    jpegQualityGroup: document.getElementById('jpeg-quality-group'),
    qualityVal: document.getElementById('quality-val'),
    btnDownloadEncrypted: document.getElementById('btn-download-encrypted'),

    // Decrypt Tab
    decDropZone: document.getElementById('dec-drop-zone'),
    decFileInput: document.getElementById('dec-file-input'),
    decModeCardLsb: document.getElementById('dec-mode-card-lsb'),
    decModeCardMsb: document.getElementById('dec-mode-card-msb'),
    decPassword: document.getElementById('dec-password'),
    toggleDecPwd: document.getElementById('toggle-dec-pwd'),
    btnProcessDecrypt: document.getElementById('btn-process-decrypt'),
    canvasDecOrig: document.getElementById('canvas-dec-orig'),
    phDecOrig: document.getElementById('ph-dec-orig'),
    canvasDecResult: document.getElementById('canvas-dec-result'),
    phDecResult: document.getElementById('ph-dec-result'),
    decMetrics: document.getElementById('dec-metrics'),
    valDecMse: document.getElementById('val-dec-mse'),
    valDecPsnr: document.getElementById('val-dec-psnr'),
    valDecSwapped: document.getElementById('val-dec-swapped'),
    decFidelityCard: document.getElementById('dec-fidelity-card'),
    btnDownloadRestored: document.getElementById('btn-download-restored'),
    decExportFormat: document.getElementById('dec-export-format'),

    // Stego Tab
    stegoTypeBtns: document.querySelectorAll('.stego-type-btn'),
    stegoEmbedSub: document.getElementById('stego-embed-sub'),
    stegoExtractSub: document.getElementById('stego-extract-sub'),
    stegoCoverZone: document.getElementById('stego-cover-zone'),
    stegoCoverInput: document.getElementById('stego-cover-input'),
    stegoSecretText: document.getElementById('stego-secret-text'),
    stegoPwd: document.getElementById('stego-pwd'),
    btnStegoEmbed: document.getElementById('btn-stego-embed'),
    stegoStegoZone: document.getElementById('stego-stego-zone'),
    stegoStegoInput: document.getElementById('stego-stego-input'),
    stegoExtPwd: document.getElementById('stego-ext-pwd'),
    btnStegoExtract: document.getElementById('btn-stego-extract'),
    canvasStegoResult: document.getElementById('canvas-stego-result'),
    phStegoResult: document.getElementById('ph-stego-result'),
    extractedPayloadDisplay: document.getElementById('extracted-payload-display'),
    btnDownloadStego: document.getElementById('btn-download-stego'),

    // Inspector Tab
    inspDropZone: document.getElementById('insp-drop-zone'),
    inspFileInput: document.getElementById('insp-file-input'),
    canvasInsp: document.getElementById('canvas-insp'),
    inspCoords: document.getElementById('insp-coords'),
    manualPixelVal: document.getElementById('manual-pixel-val'),
    btnTestSwapLsb: document.getElementById('btn-test-swap-lsb'),
    btnTestSwapMsb: document.getElementById('btn-test-swap-msb'),
    bitGridContainer: document.getElementById('bit-grid-container'),
    trValOrig: document.getElementById('tr-val-orig'),
    trBinOrig: document.getElementById('tr-bin-orig'),
    trModeName: document.getElementById('tr-mode-name'),
    trValNew: document.getElementById('tr-val-new'),
    trBinNew: document.getElementById('tr-bin-new')
  };

  /* ==========================================================================
     Tab Navigation Setup
     ========================================================================== */
  DOM.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      DOM.tabs.forEach(t => t.classList.remove('active'));
      DOM.tabPanes.forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      const targetPane = document.getElementById(tab.getAttribute('data-tab'));
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Password Visibility Toggles
  function setupPwdToggle(btn, input) {
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
      const isPwd = input.type === 'password';
      input.type = isPwd ? 'text' : 'password';
      btn.innerHTML = isPwd ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    });
  }
  setupPwdToggle(DOM.toggleEncPwd, DOM.encPassword);
  setupPwdToggle(DOM.toggleDecPwd, DOM.decPassword);

  /* ==========================================================================
     Helper Utilities
     ========================================================================== */
  function loadImage(file, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => callback(img);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function renderToCanvas(img, canvas, placeholder) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    if (placeholder) placeholder.style.display = 'none';
  }

  /* ==========================================================================
     AI Vision Detection Module (BlazeFace & COCO-SSD)
     ========================================================================== */
  let blazeFaceModel = null;
  let cocoSsdModel = null;

  async function initAIModels() {
    try {
      if (window.blazeface) {
        blazeFaceModel = await window.blazeface.load();
      }
      if (window.cocoSsd) {
        cocoSsdModel = await window.cocoSsd.load();
      }
      state.aiModelsLoaded = true;
      if (DOM.aiStatusBadge) {
        DOM.aiStatusBadge.className = 'ai-status-badge ready';
        DOM.aiStatusBadge.innerHTML = '<i class="fa-solid fa-check-circle"></i> AI Vision Ready';
      }
    } catch (err) {
      console.warn('AI Vision loading notice:', err);
      if (DOM.aiStatusBadge) {
        DOM.aiStatusBadge.className = 'ai-status-badge warning';
        DOM.aiStatusBadge.innerHTML = '<i class="fa-solid fa-circle-info"></i> Full Scramble Ready';
      }
    }
  }

  // Kick off AI model loading asynchronously
  initAIModels();

  async function runAIDetection(img) {
    if (!img) return;
    state.isAiDetecting = true;
    state.detectedFaces = [];
    state.detectedPersons = [];

    if (DOM.aiStatusBadge) {
      DOM.aiStatusBadge.className = 'ai-status-badge scanning';
      DOM.aiStatusBadge.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Scanning Person & Face...';
    }

    if (!blazeFaceModel && !cocoSsdModel) {
      await initAIModels();
    }

    const faces = [];
    const persons = [];

    try {
      // 1. Detect Faces with BlazeFace
      if (blazeFaceModel) {
        const predictions = await blazeFaceModel.estimateFaces(img, false);
        predictions.forEach((pred, idx) => {
          const start = pred.topLeft;
          const end = pred.bottomRight;
          const width = end[0] - start[0];
          const height = end[1] - start[1];
          // Add 15% margin for complete facial coverage
          const padX = width * 0.15;
          const padY = height * 0.15;
          const x = Math.max(0, Math.floor(start[0] - padX));
          const y = Math.max(0, Math.floor(start[1] - padY));
          const w = Math.min(img.width - x, Math.ceil(width + padX * 2));
          const h = Math.min(img.height - y, Math.ceil(height + padY * 2));
          const prob = Array.isArray(pred.probability) ? pred.probability[0] : pred.probability;
          faces.push({
            x, y, width: w, height: h,
            score: prob ? Math.round(prob * 100) : 98,
            label: `Face #${idx + 1}`
          });
        });
      }

      // 2. Detect Person Bodies with COCO-SSD
      if (cocoSsdModel) {
        const objects = await cocoSsdModel.detect(img);
        const personObjs = objects.filter(o => o.class === 'person' && o.score >= 0.35);
        personObjs.forEach((o, idx) => {
          const [bx, by, bw, bh] = o.bbox;
          persons.push({
            x: Math.max(0, Math.floor(bx)),
            y: Math.max(0, Math.floor(by)),
            width: Math.min(img.width - bx, Math.ceil(bw)),
            height: Math.min(img.height - by, Math.ceil(bh)),
            score: Math.round(o.score * 100),
            label: `Person #${idx + 1}`
          });
        });
      }
    } catch (err) {
      console.error('AI Detection Error:', err);
    }

    state.detectedFaces = faces;
    state.detectedPersons = persons;
    state.isAiDetecting = false;

    // Update Subtitles & Status
    if (DOM.subFaceCount) {
      DOM.subFaceCount.textContent = faces.length > 0 ? `${faces.length} face${faces.length > 1 ? 's' : ''} found` : 'None detected';
    }
    if (DOM.subPersonCount) {
      DOM.subPersonCount.textContent = persons.length > 0 ? `${persons.length} person${persons.length > 1 ? 's' : ''} found` : 'None detected';
    }
    const totalDetected = faces.length + persons.length;
    if (DOM.subAllCount) {
      DOM.subAllCount.textContent = totalDetected > 0 ? `${totalDetected} subject${totalDetected > 1 ? 's' : ''}` : 'None detected';
    }

    if (DOM.aiStatusBadge) {
      DOM.aiStatusBadge.className = 'ai-status-badge ready';
      DOM.aiStatusBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${totalDetected} Detected`;
    }

    if (DOM.aiDetectionBanner) {
      DOM.aiDetectionBanner.style.display = 'flex';
      if (totalDetected > 0) {
        DOM.aiDetectionText.innerHTML = `<i class="fa-solid fa-bullseye"></i> <b>AI Vision:</b> Detected <b>${persons.length}</b> Person(s) and <b>${faces.length}</b> Face(s). Select target scope above.`;
      } else {
        DOM.aiDetectionText.innerHTML = `<i class="fa-solid fa-circle-info"></i> No person or face detected in this photo. Encryption will apply to <b>Entire Image</b>.`;
      }
    }

    renderEncOriginalWithOverlays();
  }

  function renderEncOriginalWithOverlays() {
    if (!state.encImage) return;
    renderToCanvas(state.encImage, DOM.canvasEncOrig, DOM.phEncOrig);

    const canvas = DOM.canvasEncOrig;
    const ctx = canvas.getContext('2d');
    const scale = Math.max(1, canvas.width / 900);

    const showPersons = state.encScope === 'person' || state.encScope === 'all';
    const showFaces = state.encScope === 'face' || state.encScope === 'all';
    const isFull = state.encScope === 'full';

    // Draw Person Bodies (Cyan / Blue theme)
    if (showPersons || isFull) {
      state.detectedPersons.forEach(p => {
        ctx.save();
        ctx.strokeStyle = isFull ? 'rgba(37, 99, 235, 0.4)' : '#2563eb';
        ctx.lineWidth = Math.max(2, Math.floor(3 * scale));
        ctx.fillStyle = isFull ? 'rgba(37, 99, 235, 0.05)' : 'rgba(37, 99, 235, 0.18)';
        if (isFull) ctx.setLineDash([8, 6]);
        
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.strokeRect(p.x, p.y, p.width, p.height);

        // Label Badge
        ctx.fillStyle = isFull ? 'rgba(37, 99, 235, 0.75)' : '#2563eb';
        const fontSize = Math.max(12, Math.floor(14 * scale));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const text = `👤 ${p.label} (${p.score}%)`;
        const textW = ctx.measureText(text).width;
        const tagH = Math.max(20, Math.floor(24 * scale));
        const tagY = Math.max(0, p.y - tagH);
        
        ctx.fillRect(p.x, tagY, textW + 14, tagH);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, p.x + 7, tagY + fontSize);
        ctx.restore();
      });
    }

    // Draw Faces (Emerald Green theme)
    if (showFaces || isFull) {
      state.detectedFaces.forEach(f => {
        ctx.save();
        ctx.strokeStyle = isFull ? 'rgba(5, 150, 105, 0.5)' : '#059669';
        ctx.lineWidth = Math.max(2, Math.floor(3 * scale));
        ctx.fillStyle = isFull ? 'rgba(5, 150, 105, 0.08)' : 'rgba(5, 150, 105, 0.22)';
        if (isFull) ctx.setLineDash([6, 5]);

        ctx.fillRect(f.x, f.y, f.width, f.height);
        ctx.strokeRect(f.x, f.y, f.width, f.height);

        // Label Badge
        ctx.fillStyle = isFull ? 'rgba(5, 150, 105, 0.85)' : '#059669';
        const fontSize = Math.max(12, Math.floor(14 * scale));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const text = `😀 ${f.label} (${f.score}%)`;
        const textW = ctx.measureText(text).width;
        const tagH = Math.max(20, Math.floor(24 * scale));
        const tagY = Math.max(0, f.y - tagH);

        ctx.fillRect(f.x, tagY, textW + 14, tagH);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, f.x + 7, tagY + fontSize);
        ctx.restore();
      });
    }
  }

  function getActiveTargetRegions() {
    if (state.encScope === 'person') {
      return state.detectedPersons.length > 0 ? state.detectedPersons : null;
    } else if (state.encScope === 'face') {
      return state.detectedFaces.length > 0 ? state.detectedFaces : null;
    } else if (state.encScope === 'all') {
      const combined = [...state.detectedPersons, ...state.detectedFaces];
      return combined.length > 0 ? combined : null;
    }
    return null; // Entire Image
  }

  /* ==========================================================================
     Tab 1: Encrypt & Scramble Logic
     ========================================================================= */
  function setScope(scopeKey, targetBtn) {
    state.encScope = scopeKey;
    [DOM.btnScopeFull, DOM.btnScopePerson, DOM.btnScopeFace, DOM.btnScopeAll].forEach(b => {
      if (b) b.classList.remove('active');
    });
    if (targetBtn) targetBtn.classList.add('active');
    renderEncOriginalWithOverlays();
  }

  if (DOM.btnScopeFull) DOM.btnScopeFull.addEventListener('click', () => setScope('full', DOM.btnScopeFull));
  if (DOM.btnScopePerson) DOM.btnScopePerson.addEventListener('click', () => setScope('person', DOM.btnScopePerson));
  if (DOM.btnScopeFace) DOM.btnScopeFace.addEventListener('click', () => setScope('face', DOM.btnScopeFace));
  if (DOM.btnScopeAll) DOM.btnScopeAll.addEventListener('click', () => setScope('all', DOM.btnScopeAll));

  DOM.modeCardLsb.addEventListener('click', () => {
    DOM.modeCardLsb.classList.add('selected');
    DOM.modeCardMsb.classList.remove('selected');
    state.encMode = 'lsb';
  });

  DOM.modeCardMsb.addEventListener('click', () => {
    DOM.modeCardMsb.classList.add('selected');
    DOM.modeCardLsb.classList.remove('selected');
    state.encMode = 'msb';
  });

  DOM.encFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    loadImage(file, (img) => {
      state.encImage = img;
      renderToCanvas(img, DOM.canvasEncOrig, DOM.phEncOrig);
      DOM.btnProcessEncrypt.disabled = false;

      // Run AI Face & Body Detection
      runAIDetection(img);
    });
  });

  DOM.btnProcessEncrypt.addEventListener('click', async () => {
    if (!state.encImage) return;

    DOM.btnProcessEncrypt.disabled = true;
    DOM.btnProcessEncrypt.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Encrypting Target Region(s)...';

    setTimeout(async () => {
      // Prepare temporary canvas to read original pixels cleanly without overlays
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = state.encImage.width;
      tempCanvas.height = state.encImage.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(state.encImage, 0, 0);

      const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const targetRegions = getActiveTargetRegions();

      const result = await BitEngine.processImage(imgData, state.encMode, DOM.encPassword.value, targetRegions);

      const canvas = DOM.canvasEncResult;
      renderToCanvas(state.encImage, canvas, DOM.phEncResult);
      const ctx = canvas.getContext('2d');
      ctx.putImageData(result.imageData, 0, 0);

      // Metrics display
      DOM.valEncMse.textContent = result.mse;
      DOM.valEncPsnr.textContent = result.psnr + (result.psnr === '∞' ? '' : ' dB');
      DOM.valEncSwapped.textContent = result.swappedCount.toLocaleString();
      DOM.encMetrics.style.display = 'flex';
      DOM.btnDownloadEncrypted.disabled = false;

      DOM.btnProcessEncrypt.disabled = false;
      DOM.btnProcessEncrypt.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Execute Bit Encryption';
    }, 50);
  });

  // Export Quality Slider & Download
  DOM.encExportFormat.addEventListener('change', (e) => {
    DOM.jpegQualityGroup.style.display = (e.target.value === 'image/jpeg') ? 'block' : 'none';
  });

  DOM.encQuality.addEventListener('input', (e) => {
    DOM.qualityVal.textContent = e.target.value;
  });

  DOM.btnDownloadEncrypted.addEventListener('click', () => {
    const format = DOM.encExportFormat.value;
    const quality = parseFloat(DOM.encQuality.value);
    const canvas = DOM.canvasEncResult;
    
    const link = document.createElement('a');
    const ext = format.split('/')[1] === 'jpeg' ? 'jpg' : format.split('/')[1];
    link.download = `encrypted_bitshield_${state.encMode}.${ext}`;
    link.href = canvas.toDataURL(format, quality);
    link.click();
  });

  /* ==========================================================================
     Tab 2: Decrypt & Restore Logic (with MSE, PSNR, Bits Swapped Metrics)
     ========================================================================== */
  DOM.decModeCardLsb.addEventListener('click', () => {
    DOM.decModeCardLsb.classList.add('selected');
    DOM.decModeCardMsb.classList.remove('selected');
    state.decMode = 'lsb';
  });

  DOM.decModeCardMsb.addEventListener('click', () => {
    DOM.decModeCardMsb.classList.add('selected');
    DOM.decModeCardLsb.classList.remove('selected');
    state.decMode = 'msb';
  });

  DOM.decFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    loadImage(file, (img) => {
      state.decImage = img;
      renderToCanvas(img, DOM.canvasDecOrig, DOM.phDecOrig);
      DOM.btnProcessDecrypt.disabled = false;
    });
  });

  DOM.btnProcessDecrypt.addEventListener('click', async () => {
    if (!state.decImage) return;

    DOM.btnProcessDecrypt.disabled = true;
    DOM.btnProcessDecrypt.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Restoring Original Pixels...';

    setTimeout(async () => {
      // Temporary canvas to read encrypted input image data
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = state.decImage.width;
      tempCanvas.height = state.decImage.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(state.decImage, 0, 0);

      const inputImgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const result = await BitEngine.processImage(inputImgData, state.decMode, DOM.decPassword.value, null);

      // Render restored canvas
      const canvas = DOM.canvasDecResult;
      renderToCanvas(state.decImage, canvas, DOM.phDecResult);
      const ctx = canvas.getContext('2d');
      ctx.putImageData(result.imageData, 0, 0);

      // Decryption Quality Metrics: Encrypted Input vs Restored Output
      DOM.valDecMse.textContent = result.mse;
      DOM.valDecPsnr.textContent = result.psnr + (result.psnr === '∞' ? '' : ' dB');
      DOM.valDecSwapped.textContent = result.swappedCount.toLocaleString();
      
      DOM.decMetrics.style.display = 'flex';
      DOM.decFidelityCard.style.display = 'flex';
      DOM.btnDownloadRestored.disabled = false;

      DOM.btnProcessDecrypt.disabled = false;
      DOM.btnProcessDecrypt.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Restore Original Image';
    }, 50);
  });

  DOM.btnDownloadRestored.addEventListener('click', () => {
    const format = DOM.decExportFormat.value;
    const canvas = DOM.canvasDecResult;
    const link = document.createElement('a');
    const ext = format.split('/')[1] === 'jpeg' ? 'jpg' : format.split('/')[1];
    link.download = `restored_photo.${ext}`;
    link.href = canvas.toDataURL(format, 0.95);
    link.click();
  });

  /* ==========================================================================
     Tab 3: Invisible Steganography Logic
     ========================================================================== */
  DOM.stegoTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      DOM.stegoTypeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const type = btn.getAttribute('data-type');
      DOM.stegoEmbedSub.style.display = (type === 'embed') ? 'block' : 'none';
      DOM.stegoExtractSub.style.display = (type === 'extract') ? 'block' : 'none';
    });
  });

  DOM.stegoCoverInput.addEventListener('change', (e) => {
    loadImage(e.target.files[0], (img) => {
      state.stegoCover = img;
      DOM.btnStegoEmbed.disabled = false;
    });
  });

  DOM.stegoStegoInput.addEventListener('change', (e) => {
    loadImage(e.target.files[0], (img) => {
      state.stegoStego = img;
      DOM.btnStegoExtract.disabled = false;
    });
  });

  DOM.btnStegoEmbed.addEventListener('click', async () => {
    if (!state.stegoCover) return;
    const text = DOM.stegoSecretText.value;
    if (!text) {
      alert("Please enter a secret text message to hide.");
      return;
    }

    const canvas = DOM.canvasStegoResult;
    renderToCanvas(state.stegoCover, canvas, DOM.phStegoResult);
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    try {
      const embeddedData = await BitEngine.embedStegoPayload(imgData, text, DOM.stegoPwd.value);
      ctx.putImageData(embeddedData, 0, 0);
      DOM.extractedPayloadDisplay.textContent = `[SUCCESS] Message embedded into LSB. (${text.length} characters stored)`;
      DOM.btnDownloadStego.disabled = false;
    } catch (err) {
      alert(err.message);
    }
  });

  DOM.btnStegoExtract.addEventListener('click', async () => {
    if (!state.stegoStego) return;

    const canvas = DOM.canvasStegoResult;
    renderToCanvas(state.stegoStego, canvas, DOM.phStegoResult);
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    try {
      const extractedText = await BitEngine.extractStegoPayload(imgData, DOM.stegoExtPwd.value);
      DOM.extractedPayloadDisplay.textContent = extractedText;
    } catch (err) {
      DOM.extractedPayloadDisplay.textContent = `❌ [ERROR] ${err.message}`;
    }
  });

  DOM.btnDownloadStego.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'stego_carrier.png';
    link.href = DOM.canvasStegoResult.toDataURL('image/png');
    link.click();
  });

  /* ==========================================================================
     Tab 4: Interactive 8-Bit Matrix Inspector
     ========================================================================== */
  function updateBitMatrix(val, mode = 'lsb') {
    val = Math.max(0, Math.min(255, parseInt(val) || 0));
    state.inspPixelVal = val;

    const binStr = BitEngine.toBinary8(val);
    DOM.bitGridContainer.innerHTML = '';

    const weights = [128, 64, 32, 16, 8, 4, 2, 1];

    for (let i = 0; i < 8; i++) {
      const bitIndex = 7 - i;
      const bitVal = binStr[i];
      const cell = document.createElement('div');
      
      let typeClass = '';
      if (bitIndex >= 6) typeClass = 'msb';
      else if (bitIndex <= 1) typeClass = 'lsb';

      cell.className = `bit-cell ${typeClass}`;
      cell.innerHTML = `
        <span class="bit-index">b${bitIndex}</span>
        <span class="bit-val">${bitVal}</span>
        <span class="bit-weight">${weights[i]}</span>
      `;
      DOM.bitGridContainer.appendChild(cell);
    }

    // Comparison Display
    DOM.trValOrig.textContent = val;
    DOM.trBinOrig.textContent = `${binStr.slice(0, 4)} ${binStr.slice(4)}`;

    let newVal = val;
    if (mode === 'lsb') {
      newVal = BitEngine.swapLSB(val);
      DOM.trModeName.textContent = 'LSB Swapped (b₁b₀)';
    } else {
      newVal = BitEngine.swapMSB(val);
      DOM.trModeName.textContent = 'MSB Swapped (b₇b₆)';
    }

    const newBinStr = BitEngine.toBinary8(newVal);
    DOM.trValNew.textContent = newVal;
    DOM.trBinNew.textContent = `${newBinStr.slice(0, 4)} ${newBinStr.slice(4)}`;
  }

  DOM.manualPixelVal.addEventListener('input', (e) => {
    updateBitMatrix(e.target.value, 'lsb');
  });

  DOM.btnTestSwapLsb.addEventListener('click', () => {
    updateBitMatrix(state.inspPixelVal, 'lsb');
  });

  DOM.btnTestSwapMsb.addEventListener('click', () => {
    updateBitMatrix(state.inspPixelVal, 'msb');
  });

  DOM.inspFileInput.addEventListener('change', (e) => {
    loadImage(e.target.files[0], (img) => {
      state.inspImage = img;
      renderToCanvas(img, DOM.canvasInsp, null);
    });
  });

  DOM.canvasInsp.addEventListener('mousemove', (e) => {
    if (!state.inspImage) return;
    const rect = DOM.canvasInsp.getBoundingClientRect();
    const scaleX = DOM.canvasInsp.width / rect.width;
    const scaleY = DOM.canvasInsp.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const ctx = DOM.canvasInsp.getContext('2d');
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    
    DOM.inspCoords.innerHTML = `<i class="fa-solid fa-crosshairs"></i> Pixel (${x}, ${y}) → Red Channel: <b>${pixel[0]}</b>`;
    DOM.manualPixelVal.value = pixel[0];
    updateBitMatrix(pixel[0], 'lsb');
  });

  // Initial Matrix Render
  updateBitMatrix(161, 'lsb');

});
