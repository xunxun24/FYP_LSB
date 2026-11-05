/**
 * FYP Application Controller - UI Events, Neural Body & Face Contour Segmentation,
 * Canvas Overlay Visualization, Exact Shape MSB Encryption, & 8-Bit Inspector
 */

document.addEventListener('DOMContentLoaded', () => {

  // State Management
  const state = {
    encImage: null,
    encMode: 'msb',
    encScope: 'full', // 'full' | 'person' | 'face' | 'custom'
    decScope: 'full', // 'full' | 'person' | 'face' | 'custom'
    bodyMask: null,   // Uint8Array(width * height)
    faceMask: null,   // Uint8Array(width * height)
    allMask: null,    // Uint8Array(width * height)
    customRoi: { x: 0, y: 0, width: 0, height: 0, active: false },
    isDraggingRoi: false,
    dragStart: { x: 0, y: 0 },
    detectedBodyStats: { pixelCount: 0, coveragePct: 0, topX: 0, topY: 0 },
    detectedFaceStats: { pixelCount: 0, coveragePct: 0, topX: 0, topY: 0 },
    isAiDetecting: false,
    aiModelsLoaded: false,
    decImage: null,
    decMode: 'msb',
    lastOriginalImageData: null,
    lastEncryptedImageData: null,
    lastEncryptedScope: 'full',
    lastEncryptedPassword: '',
    lastEncryptedKeyType: 'text',
    lastEncryptedKeyImage: null,
    lastEncryptedRoi: null,
    encKeyType: 'text',
    encKeyImage: null,
    decKeyType: 'text',
    decKeyImage: null,
    stegoCover: null,
    stegoStego: null
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
    btnScopeCustom: document.getElementById('btn-scope-custom'),
    subPersonCount: document.getElementById('sub-person-count'),
    subFaceCount: document.getElementById('sub-face-count'),
    subCustomCount: document.getElementById('sub-custom-count'),
    encRoiHelper: document.getElementById('enc-roi-helper'),
    roiStatusText: document.getElementById('roi-status-text'),
    btnClearRoi: document.getElementById('btn-clear-roi'),
    aiDetectionBanner: document.getElementById('ai-detection-banner'),
    aiDetectionText: document.getElementById('ai-detection-text'),
    btnEncKeyTypeText: document.getElementById('btn-enc-keytype-text'),
    btnEncKeyTypeImage: document.getElementById('btn-enc-keytype-image'),
    encTextKeyBox: document.getElementById('enc-text-key-box'),
    encImgKeyBox: document.getElementById('enc-img-key-box'),
    encKeyImageDropzone: document.getElementById('enc-key-image-dropzone'),
    encKeyImageInput: document.getElementById('enc-key-image-input'),
    encKeyImgPrompt: document.getElementById('enc-key-img-prompt'),
    encKeyImgCard: document.getElementById('enc-key-img-card'),
    encKeyImgThumb: document.getElementById('enc-key-img-thumb'),
    encKeyImgName: document.getElementById('enc-key-img-name'),
    encKeyImgMeta: document.getElementById('enc-key-img-meta'),
    encKeyImgHash: document.getElementById('enc-key-img-hash'),
    btnEncChangeKeyImg: document.getElementById('btn-enc-change-key-img'),
    btnEncRemoveKeyImg: document.getElementById('btn-enc-remove-key-img'),
    encPwdBadge: document.getElementById('enc-pwd-badge'),
    encImgBadge: document.getElementById('enc-img-badge'),
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
    btnUseEncryptedFromEnc: document.getElementById('btn-use-encrypted-from-enc'),
    btnDecScopeFull: document.getElementById('btn-dec-scope-full'),
    btnDecScopePerson: document.getElementById('btn-dec-scope-person'),
    btnDecScopeFace: document.getElementById('btn-dec-scope-face'),
    btnDecScopeCustom: document.getElementById('btn-dec-scope-custom'),
    subDecPerson: document.getElementById('sub-dec-person'),
    subDecFace: document.getElementById('sub-dec-face'),
    subDecCustom: document.getElementById('sub-dec-custom'),
    btnDecKeyTypeText: document.getElementById('btn-dec-keytype-text'),
    btnDecKeyTypeImage: document.getElementById('btn-dec-keytype-image'),
    decTextKeyBox: document.getElementById('dec-text-key-box'),
    decImgKeyBox: document.getElementById('dec-img-key-box'),
    decKeyImageDropzone: document.getElementById('dec-key-image-dropzone'),
    decKeyImageInput: document.getElementById('dec-key-image-input'),
    decKeyImgPrompt: document.getElementById('dec-key-img-prompt'),
    decKeyImgCard: document.getElementById('dec-key-img-card'),
    decKeyImgThumb: document.getElementById('dec-key-img-thumb'),
    decKeyImgName: document.getElementById('dec-key-img-name'),
    decKeyImgMeta: document.getElementById('dec-key-img-meta'),
    decKeyImgHash: document.getElementById('dec-key-img-hash'),
    btnDecChangeKeyImg: document.getElementById('btn-dec-change-key-img'),
    btnDecRemoveKeyImg: document.getElementById('btn-dec-remove-key-img'),
    decPwdBadge: document.getElementById('dec-pwd-badge'),
    decImgBadge: document.getElementById('dec-img-badge'),
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
    btnDownloadStego: document.getElementById('btn-download-stego')
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

      if (tab.getAttribute('data-tab') === 'tab-decrypt') {
        updateDecButtonState();
      }
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
     Key Image / Visual Cryptography Key Management
     ========================================================================== */
  /* ==========================================================================
     Key Image / Visual Cryptography Key Management & Validation
     ========================================================================== */
  function updateEncButtonState() {
    if (!DOM.btnProcessEncrypt) return;
    if (!state.encImage) {
      DOM.btnProcessEncrypt.disabled = true;
      DOM.btnProcessEncrypt.classList.remove('btn-key-needed');
      DOM.btnProcessEncrypt.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Execute 3-Stage Encryption';
      return;
    }

    if (state.encKeyType === 'image' && !state.encKeyImage) {
      DOM.btnProcessEncrypt.disabled = false;
      DOM.btnProcessEncrypt.classList.add('btn-key-needed');
      DOM.btnProcessEncrypt.innerHTML = '<i class="fa-solid fa-image"></i> Please Upload Key Image First';
      return;
    }

    // Update password badge dynamically
    if (state.encKeyType === 'text' && DOM.encPwdBadge) {
      const hasPwd = DOM.encPassword && DOM.encPassword.value.trim().length > 0;
      if (hasPwd) {
        DOM.encPwdBadge.className = 'key-req-badge ready';
        DOM.encPwdBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Password Set';
      } else {
        DOM.encPwdBadge.className = 'key-req-badge';
        DOM.encPwdBadge.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Password Required';
      }
    }

    DOM.btnProcessEncrypt.disabled = false;
    DOM.btnProcessEncrypt.classList.remove('btn-key-needed');
    DOM.btnProcessEncrypt.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Execute 3-Stage Encryption';
  }

  function updateDecButtonState() {
    if (!DOM.btnProcessDecrypt) return;
    if (!state.decImage) {
      DOM.btnProcessDecrypt.disabled = true;
      DOM.btnProcessDecrypt.classList.remove('btn-key-needed');
      DOM.btnProcessDecrypt.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Restore Original Image';
      return;
    }

    if (state.decKeyType === 'image' && !state.decKeyImage) {
      DOM.btnProcessDecrypt.disabled = false;
      DOM.btnProcessDecrypt.classList.add('btn-key-needed');
      DOM.btnProcessDecrypt.innerHTML = '<i class="fa-solid fa-image"></i> Please Upload Key Image First';
      return;
    }

    // Update password badge dynamically
    if (state.decKeyType === 'text' && DOM.decPwdBadge) {
      const hasPwd = DOM.decPassword && DOM.decPassword.value.trim().length > 0;
      if (hasPwd) {
        DOM.decPwdBadge.className = 'key-req-badge ready';
        DOM.decPwdBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Password Set';
      } else {
        DOM.decPwdBadge.className = 'key-req-badge';
        DOM.decPwdBadge.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Password Required';
      }
    }

    DOM.btnProcessDecrypt.disabled = false;
    DOM.btnProcessDecrypt.classList.remove('btn-key-needed');
    DOM.btnProcessDecrypt.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Restore Original Image';
  }

  function initKeyImageSystem() {
    // Encrypt Tab Key Type Toggle (Text Password vs Image as Key)
    if (DOM.btnEncKeyTypeText && DOM.btnEncKeyTypeImage) {
      DOM.btnEncKeyTypeText.addEventListener('click', () => {
        state.encKeyType = 'text';
        DOM.btnEncKeyTypeText.classList.add('active');
        DOM.btnEncKeyTypeImage.classList.remove('active');
        const rText = DOM.btnEncKeyTypeText.querySelector('.key-card-radio');
        const rImg = DOM.btnEncKeyTypeImage.querySelector('.key-card-radio');
        if (rText) rText.innerHTML = '<i class="fa-solid fa-circle-dot"></i>';
        if (rImg) rImg.innerHTML = '<i class="fa-regular fa-circle"></i>';
        if (DOM.encTextKeyBox) DOM.encTextKeyBox.style.display = 'block';
        if (DOM.encImgKeyBox) DOM.encImgKeyBox.style.display = 'none';
        if (DOM.encPassword) DOM.encPassword.focus();
        updateEncButtonState();
      });

      DOM.btnEncKeyTypeImage.addEventListener('click', () => {
        const wasAlreadyImage = (state.encKeyType === 'image');
        state.encKeyType = 'image';
        DOM.btnEncKeyTypeImage.classList.add('active');
        DOM.btnEncKeyTypeText.classList.remove('active');
        const rText = DOM.btnEncKeyTypeText.querySelector('.key-card-radio');
        const rImg = DOM.btnEncKeyTypeImage.querySelector('.key-card-radio');
        if (rImg) rImg.innerHTML = '<i class="fa-solid fa-circle-dot"></i>';
        if (rText) rText.innerHTML = '<i class="fa-regular fa-circle"></i>';
        if (DOM.encTextKeyBox) DOM.encTextKeyBox.style.display = 'none';
        if (DOM.encImgKeyBox) DOM.encImgKeyBox.style.display = 'block';
        updateEncButtonState();

        // Immediately prompt user to choose an image file
        if (!state.encKeyImage || wasAlreadyImage) {
          if (DOM.encKeyImageInput) DOM.encKeyImageInput.click();
        }
      });
    }

    // Decrypt Tab Key Type Toggle (Text Password vs Image as Key)
    if (DOM.btnDecKeyTypeText && DOM.btnDecKeyTypeImage) {
      DOM.btnDecKeyTypeText.addEventListener('click', () => {
        state.decKeyType = 'text';
        DOM.btnDecKeyTypeText.classList.add('active');
        DOM.btnDecKeyTypeImage.classList.remove('active');
        const rText = DOM.btnDecKeyTypeText.querySelector('.key-card-radio');
        const rImg = DOM.btnDecKeyTypeImage.querySelector('.key-card-radio');
        if (rText) rText.innerHTML = '<i class="fa-solid fa-circle-dot"></i>';
        if (rImg) rImg.innerHTML = '<i class="fa-regular fa-circle"></i>';
        if (DOM.decTextKeyBox) DOM.decTextKeyBox.style.display = 'block';
        if (DOM.decImgKeyBox) DOM.decImgKeyBox.style.display = 'none';
        if (DOM.decPassword) DOM.decPassword.focus();
        updateDecButtonState();
      });

      DOM.btnDecKeyTypeImage.addEventListener('click', () => {
        const wasAlreadyImage = (state.decKeyType === 'image');
        state.decKeyType = 'image';
        DOM.btnDecKeyTypeImage.classList.add('active');
        DOM.btnDecKeyTypeText.classList.remove('active');
        const rText = DOM.btnDecKeyTypeText.querySelector('.key-card-radio');
        const rImg = DOM.btnDecKeyTypeImage.querySelector('.key-card-radio');
        if (rImg) rImg.innerHTML = '<i class="fa-solid fa-circle-dot"></i>';
        if (rText) rText.innerHTML = '<i class="fa-regular fa-circle"></i>';
        if (DOM.decTextKeyBox) DOM.decTextKeyBox.style.display = 'none';
        if (DOM.decImgKeyBox) DOM.decImgKeyBox.style.display = 'block';
        updateDecButtonState();

        // Immediately prompt user to choose an image file
        if (!state.decKeyImage || wasAlreadyImage) {
          if (DOM.decKeyImageInput) DOM.decKeyImageInput.click();
        }
      });
    }

    // Password input listeners for dynamic badge feedback
    if (DOM.encPassword) {
      DOM.encPassword.addEventListener('input', () => updateEncButtonState());
    }
    if (DOM.decPassword) {
      DOM.decPassword.addEventListener('input', () => updateDecButtonState());
    }

    // Helper: Process Key Image File
    async function handleKeyImageFile(file, isEncrypt) {
      if (!file) return;
      const isImg = (file.type && file.type.startsWith('image/')) ||
        /\.(png|jpe?g|webp|bmp|gif|tiff?|svg)$/i.test(file.name);
      if (!isImg) {
        alert(`"${file.name}" is not a recognized image file. Please upload an image (PNG, JPG, BMP, WEBP).`);
        return;
      }

      try {
        const keyData = await BitEngine.hashKeyImage(file);
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          const info = {
            file,
            url,
            hex: keyData.hex,
            displayHash: keyData.displayHash,
            fullHash: keyData.fullHash,
            name: file.name,
            sizeKb: (file.size / 1024).toFixed(1),
            width: img.width,
            height: img.height
          };

          if (isEncrypt) {
            state.encKeyImage = info;
            if (DOM.encKeyImgThumb) DOM.encKeyImgThumb.src = url;
            if (DOM.encKeyImgName) DOM.encKeyImgName.textContent = info.name;
            if (DOM.encKeyImgMeta) DOM.encKeyImgMeta.textContent = `${info.width} × ${info.height} px • ${info.sizeKb} KB`;
            if (DOM.encKeyImgHash) DOM.encKeyImgHash.innerHTML = `<i class="fa-solid fa-fingerprint"></i> SHA-256: <span>${info.displayHash}</span>`;
            if (DOM.encKeyImgPrompt) DOM.encKeyImgPrompt.style.display = 'none';
            if (DOM.encKeyImgCard) DOM.encKeyImgCard.style.display = 'flex';
            if (DOM.encImgBadge) {
              DOM.encImgBadge.className = 'key-req-badge ready';
              DOM.encImgBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Key Image Loaded';
            }
            updateEncButtonState();
          } else {
            state.decKeyImage = info;
            if (DOM.decKeyImgThumb) DOM.decKeyImgThumb.src = url;
            if (DOM.decKeyImgName) DOM.decKeyImgName.textContent = info.name;
            if (DOM.decKeyImgMeta) DOM.decKeyImgMeta.textContent = `${info.width} × ${info.height} px • ${info.sizeKb} KB`;
            if (DOM.decKeyImgHash) DOM.decKeyImgHash.innerHTML = `<i class="fa-solid fa-fingerprint"></i> SHA-256: <span>${info.displayHash}</span>`;
            if (DOM.decKeyImgPrompt) DOM.decKeyImgPrompt.style.display = 'none';
            if (DOM.decKeyImgCard) DOM.decKeyImgCard.style.display = 'flex';
            if (DOM.decImgBadge) {
              DOM.decImgBadge.className = 'key-req-badge ready';
              DOM.decImgBadge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Key Image Loaded';
            }
            updateDecButtonState();
          }
        };
        img.src = url;
      } catch (err) {
        alert("Failed to compute key image digest: " + err.message);
      }
    }

    // Encrypt Key Image File Input & Drag/Drop
    if (DOM.encKeyImageInput) {
      DOM.encKeyImageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleKeyImageFile(e.target.files[0], true);
        }
        e.target.value = ''; // Always clear so choosing the same file re-triggers change
      });
    }

    if (DOM.encKeyImageDropzone) {
      DOM.encKeyImageDropzone.addEventListener('click', (e) => {
        // Do not trigger file input if user clicked Change or Remove buttons inside card
        if (e.target.closest('#btn-enc-remove-key-img') || e.target.closest('#btn-enc-change-key-img')) {
          return;
        }
        if (DOM.encKeyImageInput) DOM.encKeyImageInput.click();
      });
      DOM.encKeyImageDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        DOM.encKeyImageDropzone.classList.add('dragover');
      });
      DOM.encKeyImageDropzone.addEventListener('dragleave', () => {
        DOM.encKeyImageDropzone.classList.remove('dragover');
      });
      DOM.encKeyImageDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        DOM.encKeyImageDropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleKeyImageFile(e.dataTransfer.files[0], true);
        }
      });
    }

    if (DOM.btnEncChangeKeyImg) {
      DOM.btnEncChangeKeyImg.addEventListener('click', (e) => {
        e.stopPropagation();
        if (DOM.encKeyImageInput) DOM.encKeyImageInput.click();
      });
    }

    if (DOM.btnEncRemoveKeyImg) {
      DOM.btnEncRemoveKeyImg.addEventListener('click', (e) => {
        e.stopPropagation();
        state.encKeyImage = null;
        if (DOM.encKeyImageInput) DOM.encKeyImageInput.value = '';
        if (DOM.encKeyImgPrompt) DOM.encKeyImgPrompt.style.display = 'block';
        if (DOM.encKeyImgCard) DOM.encKeyImgCard.style.display = 'none';
        if (DOM.encImgBadge) {
          DOM.encImgBadge.className = 'key-req-badge';
          DOM.encImgBadge.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Key Image Required';
        }
        updateEncButtonState();
      });
    }

    // Decrypt Key Image File Input & Drag/Drop
    if (DOM.decKeyImageInput) {
      DOM.decKeyImageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleKeyImageFile(e.target.files[0], false);
        }
        e.target.value = ''; // Always clear so choosing the same file re-triggers change
      });
    }

    if (DOM.decKeyImageDropzone) {
      DOM.decKeyImageDropzone.addEventListener('click', (e) => {
        // Do not trigger file input if user clicked Change or Remove buttons inside card
        if (e.target.closest('#btn-dec-remove-key-img') || e.target.closest('#btn-dec-change-key-img')) {
          return;
        }
        if (DOM.decKeyImageInput) DOM.decKeyImageInput.click();
      });
      DOM.decKeyImageDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        DOM.decKeyImageDropzone.classList.add('dragover');
      });
      DOM.decKeyImageDropzone.addEventListener('dragleave', () => {
        DOM.decKeyImageDropzone.classList.remove('dragover');
      });
      DOM.decKeyImageDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        DOM.decKeyImageDropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleKeyImageFile(e.dataTransfer.files[0], false);
        }
      });
    }

    if (DOM.btnDecChangeKeyImg) {
      DOM.btnDecChangeKeyImg.addEventListener('click', (e) => {
        e.stopPropagation();
        if (DOM.decKeyImageInput) DOM.decKeyImageInput.click();
      });
    }

    if (DOM.btnDecRemoveKeyImg) {
      DOM.btnDecRemoveKeyImg.addEventListener('click', (e) => {
        e.stopPropagation();
        state.decKeyImage = null;
        if (DOM.decKeyImageInput) DOM.decKeyImageInput.value = '';
        if (DOM.decKeyImgPrompt) DOM.decKeyImgPrompt.style.display = 'block';
        if (DOM.decKeyImgCard) DOM.decKeyImgCard.style.display = 'none';
        if (DOM.decImgBadge) {
          DOM.decImgBadge.className = 'key-req-badge';
          DOM.decImgBadge.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Matching Key Image Required';
        }
        updateDecButtonState();
      });
    }
  }

  initKeyImageSystem();
  updateEncButtonState();
  updateDecButtonState();

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
    canvas.style.display = 'block';
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    if (placeholder) placeholder.style.display = 'none';
  }

  function clearCanvasAndShowPlaceholder(canvas, placeholder) {
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
      canvas.style.display = 'none';
    }
    if (placeholder) {
      placeholder.style.display = 'flex';
    }
  }

  function clearEncryptedResultView() {
    state.lastEncryptedImageData = null;
    clearCanvasAndShowPlaceholder(DOM.canvasEncResult, DOM.phEncResult);
    if (DOM.encMetrics) DOM.encMetrics.style.display = 'none';
    if (DOM.valEncMse) DOM.valEncMse.textContent = '0.00';
    if (DOM.valEncPsnr) DOM.valEncPsnr.textContent = '∞ dB';
    if (DOM.valEncSwapped) DOM.valEncSwapped.textContent = '0';
    if (DOM.btnDownloadEncrypted) DOM.btnDownloadEncrypted.disabled = true;

    // Reset preview tabs to Side-by-Side if currently toggled to Result Only
    const prevTabs = document.querySelectorAll('.prev-tab');
    if (prevTabs.length > 0) {
      prevTabs.forEach(b => {
        if (b.getAttribute('data-view') === 'split') b.classList.add('active');
        else b.classList.remove('active');
      });
      const comp = document.getElementById('enc-comparison');
      if (comp) {
        const origBox = comp.querySelector('.comp-box:first-child');
        const resBox = comp.querySelector('.comp-box:last-child');
        if (origBox) origBox.style.display = 'flex';
        if (resBox) resBox.classList.remove('full-width');
      }
    }
  }

  function clearDecryptedResultView() {
    clearCanvasAndShowPlaceholder(DOM.canvasDecResult, DOM.phDecResult);
    if (DOM.decMetrics) DOM.decMetrics.style.display = 'none';
    if (DOM.decFidelityCard) DOM.decFidelityCard.style.display = 'none';
    if (DOM.valDecMse) DOM.valDecMse.textContent = '0.00';
    if (DOM.valDecPsnr) DOM.valDecPsnr.textContent = '∞ dB';
    if (DOM.valDecSwapped) DOM.valDecSwapped.textContent = '0';
    if (DOM.btnDownloadRestored) DOM.btnDownloadRestored.disabled = true;
  }

  // Refresh & Reset Encryption Key Source Selection & Inputs
  function refreshEncKeySourceUI() {
    state.encKeyType = 'text';
    state.encKeyImage = null;

    // Clear password input & reset status badge
    if (DOM.encPassword) {
      DOM.encPassword.value = '';
      DOM.encPassword.type = 'password';
    }
    if (DOM.toggleEncPwd) {
      DOM.toggleEncPwd.innerHTML = '<i class="fa-solid fa-eye"></i>';
    }
    if (DOM.encPwdBadge) {
      DOM.encPwdBadge.className = 'key-req-badge';
      DOM.encPwdBadge.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Password Required';
    }

    // Reset image key upload input, prompt & card
    if (DOM.encKeyImageInput) DOM.encKeyImageInput.value = '';
    if (DOM.encKeyImgPrompt) DOM.encKeyImgPrompt.style.display = 'block';
    if (DOM.encKeyImgCard) DOM.encKeyImgCard.style.display = 'none';
    if (DOM.encKeyImgThumb) DOM.encKeyImgThumb.src = '';
    if (DOM.encKeyImgName) DOM.encKeyImgName.textContent = '';
    if (DOM.encKeyImgMeta) DOM.encKeyImgMeta.textContent = '';
    if (DOM.encKeyImgHash) DOM.encKeyImgHash.innerHTML = '<i class="fa-solid fa-fingerprint"></i> SHA-256: <span>Calculating...</span>';
    if (DOM.encImgBadge) {
      DOM.encImgBadge.className = 'key-req-badge';
      DOM.encImgBadge.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Key Image Required';
    }

    // Reset selector buttons to Text Password active
    if (DOM.btnEncKeyTypeText) {
      DOM.btnEncKeyTypeText.classList.add('active');
      const rText = DOM.btnEncKeyTypeText.querySelector('.key-card-radio');
      if (rText) rText.innerHTML = '<i class="fa-solid fa-circle-dot"></i>';
    }
    if (DOM.btnEncKeyTypeImage) {
      DOM.btnEncKeyTypeImage.classList.remove('active');
      const rImg = DOM.btnEncKeyTypeImage.querySelector('.key-card-radio');
      if (rImg) rImg.innerHTML = '<i class="fa-regular fa-circle"></i>';
    }

    // Show Text Password box, hide Image Key box
    if (DOM.encTextKeyBox) DOM.encTextKeyBox.style.display = 'block';
    if (DOM.encImgKeyBox) DOM.encImgKeyBox.style.display = 'none';

    updateEncButtonState();
  }

  // Refresh & Reset Decryption Key Source Selection & Inputs
  function refreshDecKeySourceUI() {
    state.decKeyType = 'text';
    state.decKeyImage = null;

    // Clear password input & reset status badge
    if (DOM.decPassword) {
      DOM.decPassword.value = '';
      DOM.decPassword.type = 'password';
    }
    if (DOM.toggleDecPwd) {
      DOM.toggleDecPwd.innerHTML = '<i class="fa-solid fa-eye"></i>';
    }
    if (DOM.decPwdBadge) {
      DOM.decPwdBadge.className = 'key-req-badge';
      DOM.decPwdBadge.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Password Required';
    }

    // Reset image key upload input, prompt & card
    if (DOM.decKeyImageInput) DOM.decKeyImageInput.value = '';
    if (DOM.decKeyImgPrompt) DOM.decKeyImgPrompt.style.display = 'block';
    if (DOM.decKeyImgCard) DOM.decKeyImgCard.style.display = 'none';
    if (DOM.decKeyImgThumb) DOM.decKeyImgThumb.src = '';
    if (DOM.decKeyImgName) DOM.decKeyImgName.textContent = '';
    if (DOM.decKeyImgMeta) DOM.decKeyImgMeta.textContent = '';
    if (DOM.decKeyImgHash) DOM.decKeyImgHash.innerHTML = '<i class="fa-solid fa-fingerprint"></i> SHA-256: <span>Calculating...</span>';
    if (DOM.decImgBadge) {
      DOM.decImgBadge.className = 'key-req-badge';
      DOM.decImgBadge.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Matching Key Image Required';
    }

    // Reset selector buttons to Text Password active
    if (DOM.btnDecKeyTypeText) {
      DOM.btnDecKeyTypeText.classList.add('active');
      const rText = DOM.btnDecKeyTypeText.querySelector('.key-card-radio');
      if (rText) rText.innerHTML = '<i class="fa-solid fa-circle-dot"></i>';
    }
    if (DOM.btnDecKeyTypeImage) {
      DOM.btnDecKeyTypeImage.classList.remove('active');
      const rImg = DOM.btnDecKeyTypeImage.querySelector('.key-card-radio');
      if (rImg) rImg.innerHTML = '<i class="fa-regular fa-circle"></i>';
    }

    // Show Text Password box, hide Image Key box
    if (DOM.decTextKeyBox) DOM.decTextKeyBox.style.display = 'block';
    if (DOM.decImgKeyBox) DOM.decImgKeyBox.style.display = 'none';

    updateDecButtonState();
  }

  /* ==========================================================================
     AI Neural Vision & Shape Segmentation Module (BodyPix & BlazeFace)
     ========================================================================== */
  let bodyPixNet = null;
  let blazeFaceModel = null;

  async function initAIModels() {
    try {
      if (window.bodyPix) {
        bodyPixNet = await window.bodyPix.load({
          architecture: 'MobileNetV1',
          outputStride: 16,
          multiplier: 0.75,
          quantBytes: 2
        });
      }
      if (window.blazeface) {
        blazeFaceModel = await window.blazeface.load();
      }
      state.aiModelsLoaded = true;
      if (DOM.aiStatusBadge) {
        DOM.aiStatusBadge.className = 'ai-status-badge ready';
        DOM.aiStatusBadge.innerHTML = '<i class="fa-solid fa-check-circle"></i> Neural Vision Ready';
      }
    } catch (err) {
      console.warn('AI Vision neural loading note (using adaptive contour segmenter):', err);
      if (DOM.aiStatusBadge) {
        DOM.aiStatusBadge.className = 'ai-status-badge ready';
        DOM.aiStatusBadge.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Adaptive Contour Ready';
      }
    }
  }

  // Load models in background
  initAIModels();

  /**
   * Run Neural Body & Face Contour Segmentation on Input Image
   * Produces pixel-level boolean masks tracing exact body & face contours
   */
  async function runAISegmentation(img) {
    if (!img) return;
    state.isAiDetecting = true;

    if (DOM.aiStatusBadge) {
      DOM.aiStatusBadge.className = 'ai-status-badge scanning';
      DOM.aiStatusBadge.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Tracing Body & Face Contours...';
    }

    const W = img.width;
    const H = img.height;
    const totalPixels = W * H;

    const bodyMask = new Uint8Array(totalPixels);
    const faceMask = new Uint8Array(totalPixels);
    const allMask = new Uint8Array(totalPixels);

    let bodyPixels = 0;
    let facePixels = 0;

    let bodyTopX = Math.floor(W / 2);
    let bodyTopY = Math.floor(H * 0.15);
    let faceTopX = Math.floor(W / 2);
    let faceTopY = Math.floor(H * 0.15);

    let hasNeuralDetection = false;

    // 1. Try BodyPix Pixel-Level Multi-Part Segmentation
    if (bodyPixNet) {
      try {
        const partSeg = await bodyPixNet.segmentPersonParts(img, {
          flipHorizontal: false,
          internalResolution: 'medium',
          segmentationThreshold: 0.60
        });

        if (partSeg && partSeg.data && partSeg.data.length > 0) {
          const segW = partSeg.width;
          const segH = partSeg.height;
          const scaleX = segW / W;
          const scaleY = segH / H;

          let minBodyY = H;
          let minFaceY = H;

          for (let y = 0; y < H; y++) {
            const sy = Math.min(segH - 1, Math.floor(y * scaleY));
            for (let x = 0; x < W; x++) {
              const sx = Math.min(segW - 1, Math.floor(x * scaleX));
              const partId = partSeg.data[sy * segW + sx];
              const idx = y * W + x;

              if (partId >= 0) {
                // Any person body part (0 to 23)
                bodyMask[idx] = 1;
                allMask[idx] = 1;
                bodyPixels++;
                if (y < minBodyY) {
                  minBodyY = y;
                  bodyTopX = x;
                  bodyTopY = y;
                }

                // Face parts (0: left face, 1: right face)
                if (partId === 0 || partId === 1) {
                  faceMask[idx] = 1;
                  facePixels++;
                  if (y < minFaceY) {
                    minFaceY = y;
                    faceTopX = x;
                    faceTopY = y;
                  }
                }
              }
            }
          }

          if (bodyPixels > 50) {
            hasNeuralDetection = true;
          }
        }
      } catch (err) {
        console.warn('BodyPix segmentation pass note:', err);
      }
    }

    // 2. Try BlazeFace Neural Facial Contour Refinement
    if (blazeFaceModel) {
      try {
        const faces = await blazeFaceModel.estimateFaces(img, false);
        if (faces && faces.length > 0) {
          faces.forEach(f => {
            const start = f.topLeft;
            const end = f.bottomRight;
            const fw = end[0] - start[0];
            const fh = end[1] - start[1];
            const cx = (start[0] + end[0]) / 2;
            const cy = (start[1] + end[1]) / 2;
            const rx = fw * 0.54;
            const ry = fh * 0.62;

            const minX = Math.max(0, Math.floor(cx - rx));
            const maxX = Math.min(W - 1, Math.ceil(cx + rx));
            const minY = Math.max(0, Math.floor(cy - ry));
            const maxY = Math.min(H - 1, Math.ceil(cy + ry));

            faceTopX = Math.floor(cx);
            faceTopY = minY;

            for (let py = minY; py <= maxY; py++) {
              for (let px = minX; px <= maxX; px++) {
                const dx = (px - cx) / rx;
                const dy = (py - cy) / ry;
                if (dx * dx + dy * dy <= 1.0) {
                  const idx = py * W + px;
                  if (faceMask[idx] === 0) {
                    faceMask[idx] = 1;
                    facePixels++;
                  }
                  if (bodyMask[idx] === 0) {
                    bodyMask[idx] = 1;
                    bodyPixels++;
                  }
                  allMask[idx] = 1;
                }
              }
            }
          });
          hasNeuralDetection = true;
        }
      } catch (err) {
        console.warn('BlazeFace pass note:', err);
      }
    }

    // 3. Fallback Adaptive Color-Saliency Contour Segmenter
    // Traces human skin & foreground silhouette if neural network is offline
    if (!hasNeuralDetection || bodyPixels < 100) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = W;
      tempCanvas.height = H;
      const tCtx = tempCanvas.getContext('2d');
      tCtx.drawImage(img, 0, 0);
      const rawData = tCtx.getImageData(0, 0, W, H).data;

      // Extract foreground saliency & skin chrominance (YCbCr)
      let minBY = H;
      let minFY = H;

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const idx = y * W + x;
          const pIdx = idx * 4;
          const r = rawData[pIdx];
          const g = rawData[pIdx + 1];
          const b = rawData[pIdx + 2];

          // YCbCr skin & torso chrominance detection
          const Y = 0.299 * r + 0.587 * g + 0.114 * b;
          const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

          const isSkin = (Cb >= 77 && Cb <= 127 && Cr >= 133 && Cr <= 173 && r > g && g > b && (r - g) >= 15);
          
          // Foreground silhouette central proximity
          const cxNorm = (x - W / 2) / (W * 0.45);
          const cyNorm = (y - H * 0.45) / (H * 0.48);
          const isCenterBody = (cxNorm * cxNorm + cyNorm * cyNorm <= 1.0) && (Y > 20 && Y < 240);

          if (isSkin) {
            faceMask[idx] = 1;
            facePixels++;
            if (y < minFY) {
              minFY = y;
              faceTopX = x;
              faceTopY = y;
            }
          }

          if (isSkin || (isCenterBody && Math.abs(r - g) > 8)) {
            bodyMask[idx] = 1;
            allMask[idx] = 1;
            bodyPixels++;
            if (y < minBY) {
              minBY = y;
              bodyTopX = x;
              bodyTopY = y;
            }
          }
        }
      }
    }

    // Compute shape statistics
    const bodyPct = parseFloat(((bodyPixels / totalPixels) * 100).toFixed(1));
    const facePct = parseFloat(((facePixels / totalPixels) * 100).toFixed(1));

    state.bodyMask = bodyMask;
    state.faceMask = faceMask;
    state.allMask = allMask;
    state.detectedBodyStats = { pixelCount: bodyPixels, coveragePct: bodyPct, topX: bodyTopX, topY: bodyTopY };
    state.detectedFaceStats = { pixelCount: facePixels, coveragePct: facePct, topX: faceTopX, topY: faceTopY };
    state.isAiDetecting = false;

    // Update UI Badges & Subtexts
    if (DOM.subPersonCount) {
      DOM.subPersonCount.textContent = bodyPixels > 0 ? `Traced (${bodyPct}%)` : 'No body shape';
    }
    if (DOM.subFaceCount) {
      DOM.subFaceCount.textContent = facePixels > 0 ? `Traced (${facePct}%)` : 'No face shape';
    }

    if (DOM.aiStatusBadge) {
      DOM.aiStatusBadge.className = 'ai-status-badge ready';
      DOM.aiStatusBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Analysis Ready`;
    }

    if (DOM.aiDetectionBanner) {
      DOM.aiDetectionBanner.style.display = 'flex';
      if (bodyPixels > 0 || facePixels > 0) {
        DOM.aiDetectionText.innerHTML = `<i class="fa-solid fa-shapes"></i> <b>Person Contours Detected:</b> Body (${bodyPct}%) and Face (${facePct}%). Or use <b>Drag & Select ROI</b> for custom area.`;
      } else {
        DOM.aiDetectionText.innerHTML = `<i class="fa-solid fa-crosshairs"></i> <b>Custom Selection Ready:</b> Drag directly on the image to select any area to encrypt, or choose <b>Entire Image</b>.`;
      }
    }

    renderEncOriginalWithOverlays();
  }

  /**
   * Helper: Get canvas pixel coordinates from mouse/touch event
   */
  function getCanvasPixelCoords(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
    return {
      x: Math.max(0, Math.min(canvas.width, Math.round((clientX - rect.left) * scaleX))),
      y: Math.max(0, Math.min(canvas.height, Math.round((clientY - rect.top) * scaleY)))
    };
  }

  /**
   * Update ROI Status text in helper bar
   */
  function updateRoiStatusUI() {
    if (state.encScope === 'custom') {
      if (DOM.encRoiHelper) DOM.encRoiHelper.style.display = 'flex';
      if (state.customRoi.active && state.customRoi.width > 0 && state.customRoi.height > 0) {
        if (DOM.roiStatusText) {
          DOM.roiStatusText.innerHTML = `<b>Selected ROI:</b> X: ${state.customRoi.x}, Y: ${state.customRoi.y} | <b>Size:</b> ${state.customRoi.width} × ${state.customRoi.height} px (${(state.customRoi.width * state.customRoi.height).toLocaleString()} pixels). Ready to encrypt!`;
        }
        if (DOM.subCustomCount) {
          DOM.subCustomCount.textContent = `${state.customRoi.width}×${state.customRoi.height} px`;
        }
      } else {
        if (DOM.roiStatusText) {
          DOM.roiStatusText.innerHTML = `Click and drag on the <b>Original Image canvas</b> to frame any area (e.g. signature, ID number, confidential text).`;
        }
        if (DOM.subCustomCount) {
          DOM.subCustomCount.textContent = `Drag on canvas`;
        }
      }
    } else {
      if (DOM.encRoiHelper) DOM.encRoiHelper.style.display = 'none';
    }
  }

  /**
   * Draw exact non-rectangular silhouette mask, custom ROI box, and glowing boundary contours
   */
  function renderEncOriginalWithOverlays() {
    if (!state.encImage) return;
    renderToCanvas(state.encImage, DOM.canvasEncOrig, DOM.phEncOrig);

    const canvas = DOM.canvasEncOrig;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;

    const scale = Math.max(1, W / 900);
    const scope = state.encScope;

    // 1. Entire Image Scope
    if (scope === 'full') {
      ctx.save();
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.6)';
      ctx.lineWidth = Math.max(3, Math.floor(4 * scale));
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(0, 0, W, H);
      ctx.restore();
      return;
    }

    // 2. Custom Drag & Select ROI Scope
    if (scope === 'custom') {
      if (state.customRoi.active && state.customRoi.width > 0 && state.customRoi.height > 0) {
        const { x, y, width: w, height: h } = state.customRoi;
        
        ctx.save();
        // Translucent golden fill
        ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
        ctx.fillRect(x, y, w, h);

        // Dashed glowing border
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = Math.max(2.5, Math.floor(3.5 * scale));
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(x, y, w, h);

        // Corner grab anchors
        const handleRadius = Math.max(4, Math.floor(6 * scale));
        ctx.fillStyle = '#f59e0b';
        const corners = [
          [x, y], [x + w, y], [x, y + h], [x + w, y + h],
          [x + w / 2, y], [x + w / 2, y + h], [x, y + h / 2], [x + w, y + h / 2]
        ];
        corners.forEach(([cx, cy]) => {
          ctx.beginPath();
          ctx.arc(cx, cy, handleRadius, 0, Math.PI * 2);
          ctx.fill();
        });

        // Floating pill badge
        const fontSize = Math.max(12, Math.floor(14 * scale));
        const pillH = Math.max(24, Math.floor(28 * scale));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const text = `📐 Custom ROI (${w} × ${h} px)`;
        const textW = ctx.measureText(text).width;
        const bx = Math.max(10, Math.min(W - textW - 24, x));
        const by = Math.max(10, y > pillH + 10 ? y - pillH - 6 : y + h + 8);

        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(bx, by, textW + 20, pillH, 6) : ctx.rect(bx, by, textW + 20, pillH);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, bx + 10, by + fontSize + 4);
        ctx.restore();
      }
      return;
    }

    // 3. Neural Body & Face Contour Overlays
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = W;
    overlayCanvas.height = H;
    const oCtx = overlayCanvas.getContext('2d');
    const overlayImgData = oCtx.createImageData(W, H);
    const overlayBuf = overlayImgData.data;

    const showBody = (scope === 'person') && state.bodyMask;
    const showFace = (scope === 'face') && state.faceMask;

    if (showBody) {
      const mask = state.bodyMask;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const idx = y * W + x;
          if (mask[idx] === 1) {
            const bufIdx = idx * 4;
            const isEdge = (
              x === 0 || x === W - 1 || y === 0 || y === H - 1 ||
              mask[idx - 1] === 0 || mask[idx + 1] === 0 ||
              mask[idx - W] === 0 || mask[idx + W] === 0
            );

            if (isEdge) {
              overlayBuf[bufIdx] = 37;      // R
              overlayBuf[bufIdx + 1] = 99;  // G
              overlayBuf[bufIdx + 2] = 235; // B
              overlayBuf[bufIdx + 3] = 255; // Alpha
            } else {
              overlayBuf[bufIdx] = 37;
              overlayBuf[bufIdx + 1] = 99;
              overlayBuf[bufIdx + 2] = 235;
              overlayBuf[bufIdx + 3] = 48; // Translucent tint
            }
          }
        }
      }
    }

    if (showFace) {
      const mask = state.faceMask;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const idx = y * W + x;
          if (mask[idx] === 1) {
            const bufIdx = idx * 4;
            const isEdge = (
              x === 0 || x === W - 1 || y === 0 || y === H - 1 ||
              mask[idx - 1] === 0 || mask[idx + 1] === 0 ||
              mask[idx - W] === 0 || mask[idx + W] === 0
            );

            if (isEdge) {
              overlayBuf[bufIdx] = 5;       // R
              overlayBuf[bufIdx + 1] = 150; // G
              overlayBuf[bufIdx + 2] = 105; // B
              overlayBuf[bufIdx + 3] = 255; // Solid contour
            } else {
              overlayBuf[bufIdx] = 5;
              overlayBuf[bufIdx + 1] = 150;
              overlayBuf[bufIdx + 2] = 105;
              overlayBuf[bufIdx + 3] = 75; // Emerald tint
            }
          }
        }
      }
    }

    oCtx.putImageData(overlayImgData, 0, 0);

    ctx.save();
    ctx.shadowColor = (scope === 'face') ? 'rgba(5, 150, 105, 0.6)' : 'rgba(37, 99, 235, 0.6)';
    ctx.shadowBlur = Math.max(6, Math.floor(10 * scale));
    ctx.drawImage(overlayCanvas, 0, 0);
    ctx.restore();

    const fontSize = Math.max(12, Math.floor(14 * scale));
    const pillH = Math.max(24, Math.floor(28 * scale));
    ctx.font = `bold ${fontSize}px sans-serif`;

    if (showBody && state.detectedBodyStats.pixelCount > 0) {
      const text = `👤 Body Silhouette (${state.detectedBodyStats.coveragePct}%)`;
      const textW = ctx.measureText(text).width;
      const bx = Math.max(10, Math.min(W - textW - 24, state.detectedBodyStats.topX - textW / 2));
      const by = Math.max(10, state.detectedBodyStats.topY - pillH - 6);

      ctx.save();
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(bx, by, textW + 20, pillH, 6) : ctx.rect(bx, by, textW + 20, pillH);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, bx + 10, by + fontSize + 4);
      ctx.restore();
    }

    if (showFace && state.detectedFaceStats.pixelCount > 0) {
      const text = `😀 Face Contour (${state.detectedFaceStats.coveragePct}%)`;
      const textW = ctx.measureText(text).width;
      const fx = Math.max(10, Math.min(W - textW - 24, state.detectedFaceStats.topX - textW / 2));
      const fy = Math.max(10, state.detectedFaceStats.topY - pillH - 6);

      ctx.save();
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(fx, fy, textW + 20, pillH, 6) : ctx.rect(fx, fy, textW + 20, pillH);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, fx + 10, fy + fontSize + 4);
      ctx.restore();
    }
  }

  /**
   * Get active target mask or bounding box based on user scope selection
   */
  function getActiveScopeMask() {
    if (state.encScope === 'person') {
      return state.bodyMask;
    } else if (state.encScope === 'face') {
      return state.faceMask;
    } else if (state.encScope === 'custom' && state.customRoi.active && state.customRoi.width > 0 && state.customRoi.height > 0) {
      return [{
        x: state.customRoi.x,
        y: state.customRoi.y,
        width: state.customRoi.width,
        height: state.customRoi.height
      }];
    }
    return null; // Entire Image
  }

  /* ==========================================================================
     Tab 1: Encrypt Scope Controls & Drag Event Listeners
     ========================================================================== */
  function setScope(scopeKey, targetBtn) {
    state.encScope = scopeKey;
    [DOM.btnScopeFull, DOM.btnScopePerson, DOM.btnScopeFace, DOM.btnScopeCustom].forEach(b => {
      if (b) b.classList.remove('active');
    });
    if (targetBtn) targetBtn.classList.add('active');

    // Update cursor styling on canvas container
    const compBox = DOM.canvasEncOrig ? DOM.canvasEncOrig.parentElement : null;
    if (compBox) {
      if (scopeKey === 'custom') compBox.classList.add('drawing-roi');
      else compBox.classList.remove('drawing-roi');
    }

    updateRoiStatusUI();
    renderEncOriginalWithOverlays();
  }

  if (DOM.btnScopeFull) DOM.btnScopeFull.addEventListener('click', () => setScope('full', DOM.btnScopeFull));
  if (DOM.btnScopePerson) DOM.btnScopePerson.addEventListener('click', () => setScope('person', DOM.btnScopePerson));
  if (DOM.btnScopeFace) DOM.btnScopeFace.addEventListener('click', () => setScope('face', DOM.btnScopeFace));
  if (DOM.btnScopeCustom) DOM.btnScopeCustom.addEventListener('click', () => setScope('custom', DOM.btnScopeCustom));

  if (DOM.btnClearRoi) {
    DOM.btnClearRoi.addEventListener('click', () => {
      state.customRoi = { x: 0, y: 0, width: 0, height: 0, active: false };
      updateRoiStatusUI();
      renderEncOriginalWithOverlays();
    });
  }

  // Interactive Drag & Select ROI on canvasEncOrig
  if (DOM.canvasEncOrig) {
    const handleDragStart = (e) => {
      if (!state.encImage) return;
      state.isDraggingRoi = true;
      state.dragStart = getCanvasPixelCoords(DOM.canvasEncOrig, e);
      state.customRoi = { x: state.dragStart.x, y: state.dragStart.y, width: 0, height: 0, active: true };
      if (state.encScope !== 'custom') {
        setScope('custom', DOM.btnScopeCustom);
      }
    };

    const handleDragMove = (e) => {
      if (!state.isDraggingRoi || !state.encImage) return;
      const current = getCanvasPixelCoords(DOM.canvasEncOrig, e);
      const rx = Math.min(state.dragStart.x, current.x);
      const ry = Math.min(state.dragStart.y, current.y);
      const rw = Math.abs(current.x - state.dragStart.x);
      const rh = Math.abs(current.y - state.dragStart.y);
      state.customRoi = { x: rx, y: ry, width: rw, height: rh, active: true };
      renderEncOriginalWithOverlays();
      updateRoiStatusUI();
    };

    const handleDragEnd = () => {
      if (!state.isDraggingRoi) return;
      state.isDraggingRoi = false;
      if (state.customRoi.width < 5 || state.customRoi.height < 5) {
        state.customRoi.active = false;
      }
      renderEncOriginalWithOverlays();
      updateRoiStatusUI();
    };

    DOM.canvasEncOrig.addEventListener('mousedown', handleDragStart);
    window.addEventListener('mousemove', (e) => {
      if (state.isDraggingRoi) handleDragMove(e);
    });
    window.addEventListener('mouseup', handleDragEnd);

    DOM.canvasEncOrig.addEventListener('touchstart', (e) => {
      e.preventDefault();
      handleDragStart(e);
    }, { passive: false });
    DOM.canvasEncOrig.addEventListener('touchmove', (e) => {
      if (state.isDraggingRoi) {
        e.preventDefault();
        handleDragMove(e);
      }
    }, { passive: false });
    DOM.canvasEncOrig.addEventListener('touchend', handleDragEnd);
  }

  // Encrypt Tab: Image Upload & Dropzone Handling
  function handleEncImageUpload(file) {
    if (!file) return;
    loadImage(file, (img) => {
      state.encImage = img;
      state.customRoi = { x: 0, y: 0, width: 0, height: 0, active: false };
      renderToCanvas(img, DOM.canvasEncOrig, DOM.phEncOrig);

      // Refresh view: Clear previous encrypted result, metrics & download button
      clearEncryptedResultView();

      // Refresh key source selection: Reset to Text Password, clear inputs & badges
      refreshEncKeySourceUI();

      updateEncButtonState();
      updateRoiStatusUI();

      // Run Neural Body & Face Contour Segmentation
      runAISegmentation(img);
    });
  }

  if (DOM.encFileInput) {
    DOM.encFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleEncImageUpload(e.target.files[0]);
      }
      e.target.value = '';
    });
  }

  if (DOM.encDropZone) {
    DOM.encDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      DOM.encDropZone.classList.add('dragover');
    });
    DOM.encDropZone.addEventListener('dragleave', () => {
      DOM.encDropZone.classList.remove('dragover');
    });
    DOM.encDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      DOM.encDropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleEncImageUpload(e.dataTransfer.files[0]);
      }
    });
  }

  // Encrypt Process Execution (3-Stage Pipeline)
  DOM.btnProcessEncrypt.addEventListener('click', async (e) => {
    if (!state.encImage) return;

    // 1. If Text Password mode: Validate password entered
    if (state.encKeyType === 'text') {
      const pwdVal = DOM.encPassword ? DOM.encPassword.value.trim() : '';
      if (!pwdVal) {
        e.preventDefault();
        if (DOM.encPassword) {
          DOM.encPassword.classList.add('input-invalid');
          DOM.encPassword.focus();
          setTimeout(() => DOM.encPassword.classList.remove('input-invalid'), 1200);
        }
        alert("Please enter a password first to encrypt the image!");
        return;
      }
    }

    // 2. If Image Key mode: Validate key image is uploaded
    if (state.encKeyType === 'image' && !state.encKeyImage) {
      e.preventDefault();
      if (DOM.encKeyImageDropzone) {
        DOM.encKeyImageDropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
        DOM.encKeyImageDropzone.classList.add('highlight-pulse');
        setTimeout(() => DOM.encKeyImageDropzone.classList.remove('highlight-pulse'), 1500);
      }
      if (DOM.encKeyImageInput) DOM.encKeyImageInput.click();
      alert("Please upload an image to use as your encryption key before encrypting!");
      return;
    }

    // Resolve key from text password OR key image
    let effectiveKey = '';
    if (state.encKeyType === 'image') {
      effectiveKey = state.encKeyImage.hex;
    } else {
      effectiveKey = DOM.encPassword.value;
    }

    DOM.btnProcessEncrypt.disabled = true;
    DOM.btnProcessEncrypt.classList.remove('btn-key-needed');
    DOM.btnProcessEncrypt.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Encrypting (3-Stage Pipeline)...';

    setTimeout(async () => {
      // Temporary canvas to read original clean pixels without overlays
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = state.encImage.width;
      tempCanvas.height = state.encImage.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(state.encImage, 0, 0);

      const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const activeMask = getActiveScopeMask();

      // Cache original copy for ground-truth fidelity verification in Decrypt tab
      state.lastOriginalImageData = new ImageData(
        new Uint8ClampedArray(imgData.data),
        imgData.width,
        imgData.height
      );
      state.lastEncryptedScope = state.encScope;
      state.lastEncryptedPassword = DOM.encPassword.value;
      state.lastEncryptedKeyType = state.encKeyType;
      state.lastEncryptedKeyImage = state.encKeyImage ? { ...state.encKeyImage } : null;
      state.lastEncryptedRoi = (state.encScope === 'custom' && state.customRoi.active) ? { ...state.customRoi } : null;

      // Execute 3-Stage Reversible Image Encryption
      const result = await BitEngine.encryptImage(imgData, effectiveKey, activeMask);

      // Cache encrypted image result
      state.lastEncryptedImageData = new ImageData(
        new Uint8ClampedArray(result.imageData.data),
        result.imageData.width,
        result.imageData.height
      );

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

      updateEncButtonState();
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
    link.download = `encrypted_3stage.${ext}`;
    link.href = canvas.toDataURL(format, quality);
    link.click();
  });

  // Preview Tabs Toggle (Side-by-Side vs Encrypted Only)
  const prevTabs = document.querySelectorAll('.prev-tab');
  if (prevTabs.length > 0) {
    prevTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        prevTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.getAttribute('data-view');
        const comp = document.getElementById('enc-comparison');
        if (comp) {
          const origBox = comp.querySelector('.comp-box:first-child');
          const resBox = comp.querySelector('.comp-box:last-child');
          if (view === 'result') {
            if (origBox) origBox.style.display = 'none';
            if (resBox) resBox.classList.add('full-width');
          } else {
            if (origBox) origBox.style.display = 'flex';
            if (resBox) resBox.classList.remove('full-width');
          }
        }
      });
    });
  }

  /* ==========================================================================
     Tab 2: Decrypt & Restore Logic (with Scope Matching & Ground-Truth Verification)
     ========================================================================== */
  function setDecScope(scopeKey, targetBtn) {
    state.decScope = scopeKey;
    [DOM.btnDecScopeFull, DOM.btnDecScopePerson, DOM.btnDecScopeFace, DOM.btnDecScopeCustom].forEach(b => {
      if (b) b.classList.remove('active');
    });
    if (targetBtn) targetBtn.classList.add('active');
  }

  if (DOM.btnDecScopeFull) DOM.btnDecScopeFull.addEventListener('click', () => setDecScope('full', DOM.btnDecScopeFull));
  if (DOM.btnDecScopePerson) DOM.btnDecScopePerson.addEventListener('click', () => setDecScope('person', DOM.btnDecScopePerson));
  if (DOM.btnDecScopeFace) DOM.btnDecScopeFace.addEventListener('click', () => setDecScope('face', DOM.btnDecScopeFace));
  if (DOM.btnDecScopeCustom) DOM.btnDecScopeCustom.addEventListener('click', () => setDecScope('custom', DOM.btnDecScopeCustom));

  function getActiveDecScopeMask() {
    if (state.decScope === 'person') return state.bodyMask;
    if (state.decScope === 'face') return state.faceMask;
    if (state.decScope === 'custom' && state.lastEncryptedRoi) {
      return [state.lastEncryptedRoi];
    }
    return null; // Entire image
  }

  // 1-Click Test: Transfer encrypted result from Encrypt Tab to Decrypt Tab
  if (DOM.btnUseEncryptedFromEnc) {
    DOM.btnUseEncryptedFromEnc.addEventListener('click', () => {
      if (!state.lastEncryptedImageData) {
        alert("Please execute encryption on an image in the Encrypt Tab first!");
        return;
      }

      // Prepare image from lastEncryptedImageData
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = state.lastEncryptedImageData.width;
      tempCanvas.height = state.lastEncryptedImageData.height;
      const tCtx = tempCanvas.getContext('2d');
      tCtx.putImageData(state.lastEncryptedImageData, 0, 0);

      const img = new Image();
      img.onload = () => {
        state.decImage = img;
        renderToCanvas(img, DOM.canvasDecOrig, DOM.phDecOrig);

        // Refresh view: Clear previous decrypted/restored result & metrics
        clearDecryptedResultView();

        // Refresh key source selection: Reset to Text Password, clear inputs & badges
        refreshDecKeySourceUI();

        if (state.lastEncryptedScope === 'person') setDecScope('person', DOM.btnDecScopePerson);
        else if (state.lastEncryptedScope === 'face') setDecScope('face', DOM.btnDecScopeFace);
        else if (state.lastEncryptedScope === 'custom') setDecScope('custom', DOM.btnDecScopeCustom);
        else setDecScope('full', DOM.btnDecScopeFull);

        updateDecButtonState();
      };
      img.src = tempCanvas.toDataURL('image/png');
    });
  }

  function handleDecImageUpload(file) {
    if (!file) return;
    loadImage(file, (img) => {
      state.decImage = img;
      renderToCanvas(img, DOM.canvasDecOrig, DOM.phDecOrig);

      // Refresh view: Clear previous decrypted/restored result & metrics
      clearDecryptedResultView();

      // Refresh key source selection: Reset to Text Password, clear inputs & badges
      refreshDecKeySourceUI();

      updateDecButtonState();
    });
  }

  if (DOM.decFileInput) {
    DOM.decFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleDecImageUpload(e.target.files[0]);
      }
      e.target.value = '';
    });
  }

  if (DOM.decDropZone) {
    DOM.decDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      DOM.decDropZone.classList.add('dragover');
    });
    DOM.decDropZone.addEventListener('dragleave', () => {
      DOM.decDropZone.classList.remove('dragover');
    });
    DOM.decDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      DOM.decDropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleDecImageUpload(e.dataTransfer.files[0]);
      }
    });
  }

  DOM.btnProcessDecrypt.addEventListener('click', async (e) => {
    if (!state.decImage) return;

    // 1. If Text Password mode: Validate password entered
    if (state.decKeyType === 'text') {
      const pwdVal = DOM.decPassword ? DOM.decPassword.value.trim() : '';
      if (!pwdVal) {
        e.preventDefault();
        if (DOM.decPassword) {
          DOM.decPassword.classList.add('input-invalid');
          DOM.decPassword.focus();
          setTimeout(() => DOM.decPassword.classList.remove('input-invalid'), 1200);
        }
        alert("Please enter the decryption password first to restore the image!");
        return;
      }
    }

    // 2. If Image Key mode: Validate matching key image is uploaded
    if (state.decKeyType === 'image' && !state.decKeyImage) {
      e.preventDefault();
      if (DOM.decKeyImageDropzone) {
        DOM.decKeyImageDropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
        DOM.decKeyImageDropzone.classList.add('highlight-pulse');
        setTimeout(() => DOM.decKeyImageDropzone.classList.remove('highlight-pulse'), 1500);
      }
      if (DOM.decKeyImageInput) DOM.decKeyImageInput.click();
      alert("Please upload the matching key image to restore the original image!");
      return;
    }

    // Resolve key from text password OR key image
    let effectiveKey = '';
    if (state.decKeyType === 'image') {
      effectiveKey = state.decKeyImage.hex;
    } else {
      effectiveKey = DOM.decPassword.value;
    }

    DOM.btnProcessDecrypt.disabled = true;
    DOM.btnProcessDecrypt.classList.remove('btn-key-needed');
    DOM.btnProcessDecrypt.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reversing 3 Stages...';

    setTimeout(async () => {
      // Read encrypted input image data from canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = state.decImage.width;
      tempCanvas.height = state.decImage.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(state.decImage, 0, 0);

      const inputImgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const decMask = getActiveDecScopeMask();
      
      // Execute 3-Stage Reversible Image Decryption (Exact Reverse Order)
      const result = await BitEngine.decryptImage(inputImgData, effectiveKey, decMask);

      // Render restored canvas
      const canvas = DOM.canvasDecResult;
      renderToCanvas(state.decImage, canvas, DOM.phDecResult);
      const ctx = canvas.getContext('2d');
      ctx.putImageData(result.imageData, 0, 0);

      // Check ground-truth fidelity against original image if available
      if (state.lastOriginalImageData && 
          state.lastOriginalImageData.width === result.imageData.width && 
          state.lastOriginalImageData.height === result.imageData.height) {
        const fidelity = BitEngine.calculateMetrics(state.lastOriginalImageData, result.imageData);
        DOM.valDecMse.textContent = fidelity.mse.toFixed(4);
        DOM.valDecPsnr.textContent = fidelity.psnr === Infinity ? '∞' : (fidelity.psnr + ' dB');
      } else {
        DOM.valDecMse.textContent = result.mse;
        DOM.valDecPsnr.textContent = result.psnr + (result.psnr === '∞' ? '' : ' dB');
      }

      DOM.valDecSwapped.textContent = result.swappedCount.toLocaleString();
      
      DOM.decMetrics.style.display = 'flex';
      DOM.decFidelityCard.style.display = 'flex';
      DOM.btnDownloadRestored.disabled = false;

      updateDecButtonState();
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
      DOM.extractedPayloadDisplay.textContent = `[SUCCESS] Message securely embedded into image. (${text.length} characters stored)`;
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
     VIDEO SUITE SHARED BRIDGE (Connects Encrypt Page & Decrypt Page)
     ========================================================================== */
  const FYP_VideoBridge = {
    lastEncryptedBlob: null,
    lastEncryptedUrl: null,
    lastEncryptedName: '',
    lastPassword: '',
    lastAlgo: '3stage',
    lastFps: '24',
    onVideoEncrypted: null
  };

  /* ==========================================================================
     PAGE 1: VIDEO ENCRYPTION MODULE (Upload, Scramble, Preview & Export)
     ========================================================================== */
  function initVideoEncryptModule() {
    const encDOM = {
      dropZone: document.getElementById('video-enc-drop-zone'),
      fileInput: document.getElementById('video-enc-file-input'),
      dropText: document.getElementById('video-enc-drop-text'),
      dropIcon: document.getElementById('video-enc-drop-icon'),
      metaChip: document.getElementById('video-enc-meta-chip'),
      metaName: document.getElementById('meta-video-enc-name'),
      metaDuration: document.getElementById('meta-video-enc-duration'),
      metaRes: document.getElementById('meta-video-enc-res'),
      metaFrames: document.getElementById('meta-video-enc-frames'),
      password: document.getElementById('video-enc-password'),
      togglePwd: document.getElementById('toggle-video-enc-pwd'),
      algoSelect: document.getElementById('video-enc-algo-select'),
      fpsSelect: document.getElementById('video-enc-fps-select'),
      scaleSelect: document.getElementById('video-enc-scale-select'),
      progressBox: document.getElementById('video-enc-progress-box'),
      progressStatus: document.getElementById('video-enc-progress-status'),
      progressPct: document.getElementById('video-enc-progress-pct'),
      progressFill: document.getElementById('video-enc-progress-fill'),
      progressDetails: document.getElementById('video-enc-progress-details'),
      progressEta: document.getElementById('video-enc-progress-eta'),
      btnProcess: document.getElementById('btn-process-video-enc'),
      btnCancel: document.getElementById('btn-cancel-video-enc'),
      origPlayer: document.getElementById('video-enc-orig-player'),
      phOrig: document.getElementById('ph-video-enc-orig'),
      resultPlayer: document.getElementById('video-enc-result-player'),
      phResult: document.getElementById('ph-video-enc-result'),
      origTime: document.getElementById('video-enc-orig-time'),
      resultTime: document.getElementById('video-enc-result-time'),
      liveBox: document.getElementById('video-enc-live-box'),
      liveBadge: document.getElementById('live-frame-enc-badge'),
      canvasThumb: document.getElementById('canvas-video-enc-thumb'),
      btnSyncPlay: document.getElementById('btn-sync-play-enc'),
      btnSyncPause: document.getElementById('btn-sync-pause-enc'),
      btnSyncReset: document.getElementById('btn-sync-reset-enc'),
      metricsBar: document.getElementById('video-enc-metrics-bar'),
      valFrames: document.getElementById('val-video-enc-frames'),
      valSpeed: document.getElementById('val-video-enc-speed'),
      valMse: document.getElementById('val-video-enc-mse'),
      valPsnr: document.getElementById('val-video-enc-psnr'),
      btnDownload: document.getElementById('btn-download-video-enc'),
      btnGotoDecrypt: document.getElementById('btn-goto-decrypt')
    };

    const encState = {
      videoLoaded: false,
      videoFile: null,
      videoUrl: null,
      processedBlob: null,
      processedUrl: null,
      isProcessing: false,
      cancelRequested: false
    };

    if (encDOM.togglePwd && encDOM.password) {
      setupPwdToggle(encDOM.togglePwd, encDOM.password);
    }

    if (encDOM.dropZone && encDOM.fileInput) {
      encDOM.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        encDOM.dropZone.classList.add('drag-active');
      });

      encDOM.dropZone.addEventListener('dragleave', () => {
        encDOM.dropZone.classList.remove('drag-active');
      });

      encDOM.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        encDOM.dropZone.classList.remove('drag-active');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleEncVideoSelect(e.dataTransfer.files[0]);
        }
      });

      encDOM.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleEncVideoSelect(e.target.files[0]);
        }
      });
    }

    function handleEncVideoSelect(file) {
      if (!file) return;

      const isVideo = (file.type && file.type.startsWith('video/')) ||
        /\.(mp4|webm|mov|mkv|avi|m4v|3gp|wmv|flv|ts|ogv)$/i.test(file.name);

      if (!isVideo) {
        alert(`"${file.name}" does not appear to be a recognized video file. Please select an MP4, WebM, MOV, MKV, or AVI file.`);
        return;
      }

      encState.videoFile = file;
      if (encState.videoUrl) URL.revokeObjectURL(encState.videoUrl);
      encState.videoUrl = URL.createObjectURL(file);
      loadEncVideoIntoPlayer(encState.videoUrl, file.name);

      setTimeout(() => {
        if (encDOM.fileInput) encDOM.fileInput.value = '';
      }, 600);
    }

    function loadEncVideoIntoPlayer(url, name = "uploaded_video.mp4") {
      const video = encDOM.origPlayer;
      if (!video) return;

      if (encDOM.phOrig) encDOM.phOrig.style.display = 'none';
      video.style.display = 'block';

      if (encDOM.dropZone) {
        encDOM.dropZone.classList.add('has-file');
        if (encDOM.dropIcon) {
          encDOM.dropIcon.className = 'fa-solid fa-circle-check drop-icon';
          encDOM.dropIcon.style.color = '#059669';
        }
        if (encDOM.dropText) {
          encDOM.dropText.innerHTML = `✅ <b>Selected:</b> <span style="color: #059669;">${name}</span>`;
        }
      }

      video.src = url;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.controls = true;

      const onMeta = () => {
        const dur = video.duration || 0;
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 360;
        const fps = parseInt(encDOM.fpsSelect ? encDOM.fpsSelect.value : "24", 10);
        const estFrames = Math.max(1, Math.round(dur * fps));

        if (encDOM.metaName) encDOM.metaName.textContent = name;
        if (encDOM.metaDuration) encDOM.metaDuration.textContent = dur.toFixed(1) + 's';
        if (encDOM.metaRes) encDOM.metaRes.textContent = `${w} × ${h}`;
        if (encDOM.metaFrames) encDOM.metaFrames.textContent = `~${estFrames} frames`;
        if (encDOM.metaChip) encDOM.metaChip.style.display = 'flex';

        if (encDOM.dropText) {
          encDOM.dropText.innerHTML = `✅ <b>Selected:</b> ${name} (${dur.toFixed(1)}s, ${w}×${h})`;
        }

        encState.videoLoaded = true;
        if (encDOM.btnProcess) encDOM.btnProcess.disabled = false;

        video.play().catch(() => {
          video.currentTime = 0.05;
        });
      };

      video.onloadedmetadata = onMeta;
      video.addEventListener('loadeddata', onMeta, { once: true });
      video.addEventListener('canplay', onMeta, { once: true });

      if (video.readyState >= 1) onMeta();

      video.onerror = () => {
        alert(`The browser was unable to decode "${name}". Please ensure it is an MP4 (H.264) or WebM video.`);
        if (encDOM.phOrig) encDOM.phOrig.style.display = 'flex';
        video.style.display = 'none';
        if (encDOM.dropZone) encDOM.dropZone.classList.remove('has-file');
      };
    }

    // Process Video Encryption
    if (encDOM.btnProcess) {
      encDOM.btnProcess.addEventListener('click', async () => {
        if (!encState.videoLoaded) return;

        const video = encDOM.origPlayer;
        const password = encDOM.password ? encDOM.password.value : '';
        const algo = encDOM.algoSelect ? encDOM.algoSelect.value : '3stage';
        const targetFps = parseInt(encDOM.fpsSelect ? encDOM.fpsSelect.value : '24', 10);
        const scaleMode = encDOM.scaleSelect ? encDOM.scaleSelect.value : 'optimized';

        let targetW = video.videoWidth || 640;
        let targetH = video.videoHeight || 360;

        if (scaleMode === 'optimized' && targetW > 640) {
          const scale = 640 / targetW;
          targetW = 640;
          targetH = Math.round((targetH * scale) / 2) * 2;
        } else {
          targetW = Math.round(targetW / 2) * 2;
          targetH = Math.round(targetH / 2) * 2;
        }

        const duration = Math.min(video.duration, 8.0);
        const totalFrames = Math.max(1, Math.floor(duration * targetFps));

        encState.isProcessing = true;
        encState.cancelRequested = false;
        encDOM.btnProcess.disabled = true;
        if (encDOM.btnCancel) encDOM.btnCancel.style.display = 'inline-flex';
        if (encDOM.progressBox) encDOM.progressBox.style.display = 'block';
        if (encDOM.liveBox) encDOM.liveBox.style.display = 'block';
        if (encDOM.progressFill) encDOM.progressFill.style.width = '0%';
        if (encDOM.progressPct) encDOM.progressPct.textContent = '0%';
        if (encDOM.progressStatus) {
          encDOM.progressStatus.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Initializing Video Encryption...';
        }

        const offCanvas = document.createElement('canvas');
        offCanvas.width = targetW;
        offCanvas.height = targetH;
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

        if (encDOM.canvasThumb) {
          encDOM.canvasThumb.width = targetW;
          encDOM.canvasThumb.height = targetH;
        }
        const thumbCtx = encDOM.canvasThumb ? encDOM.canvasThumb.getContext('2d') : null;

        const master32 = await BitEngine.createFastMasterKey(password);
        const processedFrames = [];
        let totalMse = 0;
        let totalSwapped = 0;
        const startTime = performance.now();

        for (let i = 0; i < totalFrames; i++) {
          if (encState.cancelRequested) break;

          const t = i / targetFps;
          video.currentTime = Math.min(t, video.duration - 0.01);

          await new Promise(resolve => {
            const onSeek = () => { video.removeEventListener('seeked', onSeek); resolve(); };
            video.addEventListener('seeked', onSeek, { once: true });
            setTimeout(onSeek, 250);
          });

          offCtx.drawImage(video, 0, 0, targetW, targetH);
          const imgData = offCtx.getImageData(0, 0, targetW, targetH);

          const frameStats = BitEngine.encryptVideoFrame(imgData, master32, i, algo);
          totalMse += frameStats.mse;
          totalSwapped += frameStats.swappedCount;

          processedFrames.push(imgData);
          if (thumbCtx) thumbCtx.putImageData(imgData, 0, 0);

          const pct = Math.round(((i + 1) / totalFrames) * 100);
          if (encDOM.progressFill) encDOM.progressFill.style.width = pct + '%';
          if (encDOM.progressPct) encDOM.progressPct.textContent = pct + '%';
          if (encDOM.progressDetails) {
            const curFps = Math.round((i + 1) / (Math.max(0.01, (performance.now() - startTime) / 1000)));
            encDOM.progressDetails.textContent = `Frame ${i + 1} / ${totalFrames} (${curFps} FPS)`;
          }

          const elapsedSec = (performance.now() - startTime) / 1000;
          const estTotal = (elapsedSec / (i + 1)) * totalFrames;
          const eta = Math.max(0, estTotal - elapsedSec).toFixed(1);
          if (encDOM.progressEta) encDOM.progressEta.textContent = `ETA: ${eta}s`;
          if (encDOM.liveBadge) encDOM.liveBadge.textContent = `Frame ${i + 1} / ${totalFrames}`;

          if (i % 2 === 0) await new Promise(r => setTimeout(r, 0));
        }

        if (encState.cancelRequested || processedFrames.length === 0) {
          encState.isProcessing = false;
          encDOM.btnProcess.disabled = false;
          if (encDOM.btnCancel) encDOM.btnCancel.style.display = 'none';
          if (encDOM.progressStatus) encDOM.progressStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Encryption Cancelled';
          return;
        }

        if (encDOM.progressStatus) encDOM.progressStatus.innerHTML = '<i class="fa-solid fa-film fa-spin"></i> Compiling Encrypted WebM Stream...';
        if (encDOM.progressEta) encDOM.progressEta.textContent = 'Finalizing stream...';

        const recCanvas = document.createElement('canvas');
        recCanvas.width = targetW;
        recCanvas.height = targetH;
        const recCtx = recCanvas.getContext('2d');

        const stream = recCanvas.captureStream(targetFps);
        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3000000 });
        const chunks = [];
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          if (encState.processedUrl) URL.revokeObjectURL(encState.processedUrl);
          encState.processedBlob = blob;
          encState.processedUrl = URL.createObjectURL(blob);

          encDOM.resultPlayer.src = encState.processedUrl;
          encDOM.resultPlayer.load();
          if (encDOM.phResult) encDOM.phResult.style.display = 'none';
          encDOM.resultPlayer.style.display = 'block';

          if (encDOM.btnDownload) encDOM.btnDownload.disabled = false;
          if (encDOM.btnGotoDecrypt) encDOM.btnGotoDecrypt.style.display = 'block';
          if (encDOM.btnSyncPlay) encDOM.btnSyncPlay.disabled = false;
          if (encDOM.btnSyncPause) encDOM.btnSyncPause.disabled = false;
          if (encDOM.btnSyncReset) encDOM.btnSyncReset.disabled = false;

          const totalTimeSec = (performance.now() - startTime) / 1000;
          const avgFps = (totalFrames / Math.max(0.01, totalTimeSec)).toFixed(1);
          const avgMse = (totalMse / totalFrames).toFixed(2);
          const avgPsnr = avgMse > 0 ? (10 * Math.log10((255 * 255) / avgMse)).toFixed(2) : '∞';

          if (encDOM.valFrames) encDOM.valFrames.textContent = totalFrames;
          if (encDOM.valSpeed) encDOM.valSpeed.textContent = `${avgFps} FPS`;
          if (encDOM.valMse) encDOM.valMse.textContent = avgMse;
          if (encDOM.valPsnr) encDOM.valPsnr.textContent = `${avgPsnr} dB`;
          if (encDOM.metricsBar) encDOM.metricsBar.style.display = 'flex';

          if (encDOM.progressStatus) {
            encDOM.progressStatus.innerHTML = '<i class="fa-solid fa-circle-check" style="color: var(--accent-emerald);"></i> Encryption Complete!';
          }

          // Register in shared bridge for seamless decryption
          FYP_VideoBridge.lastEncryptedBlob = blob;
          FYP_VideoBridge.lastEncryptedUrl = encState.processedUrl;
          FYP_VideoBridge.lastEncryptedName = `encrypted_${encState.videoFile ? encState.videoFile.name : 'video.webm'}`;
          FYP_VideoBridge.lastPassword = password;
          FYP_VideoBridge.lastAlgo = algo;
          FYP_VideoBridge.lastFps = targetFps.toString();
          if (typeof FYP_VideoBridge.onVideoEncrypted === 'function') {
            FYP_VideoBridge.onVideoEncrypted();
          }

          encState.isProcessing = false;
          encDOM.btnProcess.disabled = false;
          if (encDOM.btnCancel) encDOM.btnCancel.style.display = 'none';
        };

        recorder.start();

        let frameIdx = 0;
        const streamInterval = 1000 / targetFps;
        const playTimer = setInterval(() => {
          if (frameIdx < processedFrames.length && !encState.cancelRequested) {
            recCtx.putImageData(processedFrames[frameIdx], 0, 0);
            frameIdx++;
          } else {
            clearInterval(playTimer);
            setTimeout(() => {
              if (recorder.state !== 'inactive') recorder.stop();
            }, 150);
          }
        }, streamInterval);
      });
    }

    if (encDOM.btnCancel) {
      encDOM.btnCancel.addEventListener('click', () => {
        encState.cancelRequested = true;
      });
    }

    // Synchronized Dual Playback Controls (Encrypt Tab)
    if (encDOM.btnSyncPlay) {
      encDOM.btnSyncPlay.addEventListener('click', () => {
        encDOM.resultPlayer.currentTime = encDOM.origPlayer.currentTime;
        encDOM.origPlayer.play();
        encDOM.resultPlayer.play();
      });
    }

    if (encDOM.btnSyncPause) {
      encDOM.btnSyncPause.addEventListener('click', () => {
        encDOM.origPlayer.pause();
        encDOM.resultPlayer.pause();
      });
    }

    if (encDOM.btnSyncReset) {
      encDOM.btnSyncReset.addEventListener('click', () => {
        encDOM.origPlayer.pause();
        encDOM.resultPlayer.pause();
        encDOM.origPlayer.currentTime = 0;
        encDOM.resultPlayer.currentTime = 0;
      });
    }

    if (encDOM.origPlayer) {
      encDOM.origPlayer.addEventListener('timeupdate', () => {
        const cur = encDOM.origPlayer.currentTime;
        const dur = encDOM.origPlayer.duration || 0;
        if (encDOM.origTime) encDOM.origTime.textContent = `${cur.toFixed(1)}s / ${dur.toFixed(1)}s`;
      });
    }

    if (encDOM.resultPlayer) {
      encDOM.resultPlayer.addEventListener('timeupdate', () => {
        const cur = encDOM.resultPlayer.currentTime;
        const dur = encDOM.resultPlayer.duration || 0;
        if (encDOM.resultTime) encDOM.resultTime.textContent = `${cur.toFixed(1)}s / ${dur.toFixed(1)}s`;
      });
    }

    if (encDOM.btnDownload) {
      encDOM.btnDownload.addEventListener('click', () => {
        if (!encState.processedBlob) return;
        const link = document.createElement('a');
        link.href = encState.processedUrl;
        link.download = `encrypted_video_${Date.now()}.webm`;
        link.click();
      });
    }

    // One-click jump to Decrypt tab with the encrypted video loaded
    if (encDOM.btnGotoDecrypt) {
      encDOM.btnGotoDecrypt.addEventListener('click', () => {
        const decTabBtn = document.getElementById('tab-btn-video-dec');
        if (decTabBtn) decTabBtn.click();
        const bridgeBtn = document.getElementById('btn-use-last-encrypted');
        if (bridgeBtn) bridgeBtn.click();
      });
    }
  }

  /* ==========================================================================
     PAGE 2: VIDEO DECRYPTION MODULE (Upload, Invert, Preview & Export)
     ========================================================================== */
  function initVideoDecryptModule() {
    const decDOM = {
      bridgeBox: document.getElementById('dec-bridge-box'),
      btnUseLast: document.getElementById('btn-use-last-encrypted'),
      dropZone: document.getElementById('video-dec-drop-zone'),
      fileInput: document.getElementById('video-dec-file-input'),
      dropText: document.getElementById('video-dec-drop-text'),
      dropIcon: document.getElementById('video-dec-drop-icon'),
      metaChip: document.getElementById('video-dec-meta-chip'),
      metaName: document.getElementById('meta-video-dec-name'),
      metaDuration: document.getElementById('meta-video-dec-duration'),
      metaRes: document.getElementById('meta-video-dec-res'),
      metaFrames: document.getElementById('meta-video-dec-frames'),
      password: document.getElementById('video-dec-password'),
      togglePwd: document.getElementById('toggle-video-dec-pwd'),
      algoSelect: document.getElementById('video-dec-algo-select'),
      fpsSelect: document.getElementById('video-dec-fps-select'),
      scaleSelect: document.getElementById('video-dec-scale-select'),
      progressBox: document.getElementById('video-dec-progress-box'),
      progressStatus: document.getElementById('video-dec-progress-status'),
      progressPct: document.getElementById('video-dec-progress-pct'),
      progressFill: document.getElementById('video-dec-progress-fill'),
      progressDetails: document.getElementById('video-dec-progress-details'),
      progressEta: document.getElementById('video-dec-progress-eta'),
      btnProcess: document.getElementById('btn-process-video-dec'),
      btnCancel: document.getElementById('btn-cancel-video-dec'),
      origPlayer: document.getElementById('video-dec-orig-player'),
      phOrig: document.getElementById('ph-video-dec-orig'),
      resultPlayer: document.getElementById('video-dec-result-player'),
      phResult: document.getElementById('ph-video-dec-result'),
      origTime: document.getElementById('video-dec-orig-time'),
      resultTime: document.getElementById('video-dec-result-time'),
      liveBox: document.getElementById('video-dec-live-box'),
      liveBadge: document.getElementById('live-frame-dec-badge'),
      canvasThumb: document.getElementById('canvas-video-dec-thumb'),
      btnSyncPlay: document.getElementById('btn-sync-play-dec'),
      btnSyncPause: document.getElementById('btn-sync-pause-dec'),
      btnSyncReset: document.getElementById('btn-sync-reset-dec'),
      metricsBar: document.getElementById('video-dec-metrics-bar'),
      valFrames: document.getElementById('val-video-dec-frames'),
      valSpeed: document.getElementById('val-video-dec-speed'),
      valQuality: document.getElementById('val-video-dec-quality'),
      valStatus: document.getElementById('val-video-dec-status'),
      btnDownload: document.getElementById('btn-download-video-dec')
    };

    const decState = {
      videoLoaded: false,
      videoFile: null,
      videoUrl: null,
      processedBlob: null,
      processedUrl: null,
      isProcessing: false,
      cancelRequested: false
    };

    if (decDOM.togglePwd && decDOM.password) {
      setupPwdToggle(decDOM.togglePwd, decDOM.password);
    }

    // Bridge Notification: Show bridge button if video was encrypted in Encrypt page
    FYP_VideoBridge.onVideoEncrypted = () => {
      if (decDOM.bridgeBox) decDOM.bridgeBox.style.display = 'block';
    };

    if (decDOM.btnUseLast) {
      decDOM.btnUseLast.addEventListener('click', () => {
        if (!FYP_VideoBridge.lastEncryptedUrl) return;

        if (FYP_VideoBridge.lastPassword && decDOM.password) {
          decDOM.password.value = FYP_VideoBridge.lastPassword;
        }
        if (FYP_VideoBridge.lastAlgo && decDOM.algoSelect) {
          decDOM.algoSelect.value = FYP_VideoBridge.lastAlgo;
        }
        if (FYP_VideoBridge.lastFps && decDOM.fpsSelect) {
          decDOM.fpsSelect.value = FYP_VideoBridge.lastFps;
        }

        loadDecVideoIntoPlayer(FYP_VideoBridge.lastEncryptedUrl, FYP_VideoBridge.lastEncryptedName || "encrypted_video.webm");
      });
    }

    if (decDOM.dropZone && decDOM.fileInput) {
      decDOM.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        decDOM.dropZone.classList.add('drag-active');
      });

      decDOM.dropZone.addEventListener('dragleave', () => {
        decDOM.dropZone.classList.remove('drag-active');
      });

      decDOM.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        decDOM.dropZone.classList.remove('drag-active');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleDecVideoSelect(e.dataTransfer.files[0]);
        }
      });

      decDOM.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleDecVideoSelect(e.target.files[0]);
        }
      });
    }

    function handleDecVideoSelect(file) {
      if (!file) return;

      const isVideo = (file.type && file.type.startsWith('video/')) ||
        /\.(mp4|webm|mov|mkv|avi|m4v|3gp|wmv|flv|ts|ogv)$/i.test(file.name);

      if (!isVideo) {
        alert(`"${file.name}" does not appear to be a recognized video file. Please select a video (WebM, MP4, etc.).`);
        return;
      }

      decState.videoFile = file;
      if (decState.videoUrl) URL.revokeObjectURL(decState.videoUrl);
      decState.videoUrl = URL.createObjectURL(file);
      loadDecVideoIntoPlayer(decState.videoUrl, file.name);

      setTimeout(() => {
        if (decDOM.fileInput) decDOM.fileInput.value = '';
      }, 600);
    }

    function loadDecVideoIntoPlayer(url, name = "encrypted_video.webm") {
      const video = decDOM.origPlayer;
      if (!video) return;

      if (decDOM.phOrig) decDOM.phOrig.style.display = 'none';
      video.style.display = 'block';

      if (decDOM.dropZone) {
        decDOM.dropZone.classList.add('has-file');
        if (decDOM.dropIcon) {
          decDOM.dropIcon.className = 'fa-solid fa-circle-check drop-icon';
          decDOM.dropIcon.style.color = '#059669';
        }
        if (decDOM.dropText) {
          decDOM.dropText.innerHTML = `✅ <b>Selected:</b> <span style="color: #059669;">${name}</span>`;
        }
      }

      video.src = url;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.controls = true;

      const onMeta = () => {
        const dur = video.duration || 0;
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 360;
        const fps = parseInt(decDOM.fpsSelect ? decDOM.fpsSelect.value : "24", 10);
        const estFrames = Math.max(1, Math.round(dur * fps));

        if (decDOM.metaName) decDOM.metaName.textContent = name;
        if (decDOM.metaDuration) decDOM.metaDuration.textContent = dur.toFixed(1) + 's';
        if (decDOM.metaRes) decDOM.metaRes.textContent = `${w} × ${h}`;
        if (decDOM.metaFrames) decDOM.metaFrames.textContent = `~${estFrames} frames`;
        if (decDOM.metaChip) decDOM.metaChip.style.display = 'flex';

        if (decDOM.dropText) {
          decDOM.dropText.innerHTML = `✅ <b>Selected:</b> ${name} (${dur.toFixed(1)}s, ${w}×${h})`;
        }

        decState.videoLoaded = true;
        if (decDOM.btnProcess) decDOM.btnProcess.disabled = false;

        video.play().catch(() => {
          video.currentTime = 0.05;
        });
      };

      video.onloadedmetadata = onMeta;
      video.addEventListener('loadeddata', onMeta, { once: true });
      video.addEventListener('canplay', onMeta, { once: true });

      if (video.readyState >= 1) onMeta();

      video.onerror = () => {
        alert(`The browser was unable to decode "${name}". Please ensure it is a valid video file.`);
        if (decDOM.phOrig) decDOM.phOrig.style.display = 'flex';
        video.style.display = 'none';
        if (decDOM.dropZone) decDOM.dropZone.classList.remove('has-file');
      };
    }

    // Process Video Decryption
    if (decDOM.btnProcess) {
      decDOM.btnProcess.addEventListener('click', async () => {
        if (!decState.videoLoaded) return;

        const video = decDOM.origPlayer;
        const password = decDOM.password ? decDOM.password.value : '';
        const algo = decDOM.algoSelect ? decDOM.algoSelect.value : '3stage';
        const targetFps = parseInt(decDOM.fpsSelect ? decDOM.fpsSelect.value : '24', 10);
        const scaleMode = decDOM.scaleSelect ? decDOM.scaleSelect.value : 'optimized';

        let targetW = video.videoWidth || 640;
        let targetH = video.videoHeight || 360;

        if (scaleMode === 'optimized' && targetW > 640) {
          const scale = 640 / targetW;
          targetW = 640;
          targetH = Math.round((targetH * scale) / 2) * 2;
        } else {
          targetW = Math.round(targetW / 2) * 2;
          targetH = Math.round(targetH / 2) * 2;
        }

        const duration = Math.min(video.duration, 8.0);
        const totalFrames = Math.max(1, Math.floor(duration * targetFps));

        decState.isProcessing = true;
        decState.cancelRequested = false;
        decDOM.btnProcess.disabled = true;
        if (decDOM.btnCancel) decDOM.btnCancel.style.display = 'inline-flex';
        if (decDOM.progressBox) decDOM.progressBox.style.display = 'block';
        if (decDOM.liveBox) decDOM.liveBox.style.display = 'block';
        if (decDOM.progressFill) decDOM.progressFill.style.width = '0%';
        if (decDOM.progressPct) decDOM.progressPct.textContent = '0%';
        if (decDOM.progressStatus) {
          decDOM.progressStatus.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Initializing Video Decryption...';
        }

        const offCanvas = document.createElement('canvas');
        offCanvas.width = targetW;
        offCanvas.height = targetH;
        const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

        if (decDOM.canvasThumb) {
          decDOM.canvasThumb.width = targetW;
          decDOM.canvasThumb.height = targetH;
        }
        const thumbCtx = decDOM.canvasThumb ? decDOM.canvasThumb.getContext('2d') : null;

        const master32 = await BitEngine.createFastMasterKey(password);
        const processedFrames = [];
        const startTime = performance.now();

        for (let i = 0; i < totalFrames; i++) {
          if (decState.cancelRequested) break;

          const t = i / targetFps;
          video.currentTime = Math.min(t, video.duration - 0.01);

          await new Promise(resolve => {
            const onSeek = () => { video.removeEventListener('seeked', onSeek); resolve(); };
            video.addEventListener('seeked', onSeek, { once: true });
            setTimeout(onSeek, 250);
          });

          offCtx.drawImage(video, 0, 0, targetW, targetH);
          const imgData = offCtx.getImageData(0, 0, targetW, targetH);

          BitEngine.decryptVideoFrame(imgData, master32, i, algo);

          processedFrames.push(imgData);
          if (thumbCtx) thumbCtx.putImageData(imgData, 0, 0);

          const pct = Math.round(((i + 1) / totalFrames) * 100);
          if (decDOM.progressFill) decDOM.progressFill.style.width = pct + '%';
          if (decDOM.progressPct) decDOM.progressPct.textContent = pct + '%';
          if (decDOM.progressDetails) {
            const curFps = Math.round((i + 1) / (Math.max(0.01, (performance.now() - startTime) / 1000)));
            decDOM.progressDetails.textContent = `Frame ${i + 1} / ${totalFrames} (${curFps} FPS)`;
          }

          const elapsedSec = (performance.now() - startTime) / 1000;
          const estTotal = (elapsedSec / (i + 1)) * totalFrames;
          const eta = Math.max(0, estTotal - elapsedSec).toFixed(1);
          if (decDOM.progressEta) decDOM.progressEta.textContent = `ETA: ${eta}s`;
          if (decDOM.liveBadge) decDOM.liveBadge.textContent = `Frame ${i + 1} / ${totalFrames}`;

          if (i % 2 === 0) await new Promise(r => setTimeout(r, 0));
        }

        if (decState.cancelRequested || processedFrames.length === 0) {
          decState.isProcessing = false;
          decDOM.btnProcess.disabled = false;
          if (decDOM.btnCancel) decDOM.btnCancel.style.display = 'none';
          if (decDOM.progressStatus) decDOM.progressStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Decryption Cancelled';
          return;
        }

        if (decDOM.progressStatus) decDOM.progressStatus.innerHTML = '<i class="fa-solid fa-film fa-spin"></i> Compiling Restored WebM Stream...';
        if (decDOM.progressEta) decDOM.progressEta.textContent = 'Finalizing stream...';

        const recCanvas = document.createElement('canvas');
        recCanvas.width = targetW;
        recCanvas.height = targetH;
        const recCtx = recCanvas.getContext('2d');

        const stream = recCanvas.captureStream(targetFps);
        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3000000 });
        const chunks = [];
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          if (decState.processedUrl) URL.revokeObjectURL(decState.processedUrl);
          decState.processedBlob = blob;
          decState.processedUrl = URL.createObjectURL(blob);

          decDOM.resultPlayer.src = decState.processedUrl;
          decDOM.resultPlayer.load();
          if (decDOM.phResult) decDOM.phResult.style.display = 'none';
          decDOM.resultPlayer.style.display = 'block';

          if (decDOM.btnDownload) decDOM.btnDownload.disabled = false;
          if (decDOM.btnSyncPlay) decDOM.btnSyncPlay.disabled = false;
          if (decDOM.btnSyncPause) decDOM.btnSyncPause.disabled = false;
          if (decDOM.btnSyncReset) decDOM.btnSyncReset.disabled = false;

          const totalTimeSec = (performance.now() - startTime) / 1000;
          const avgFps = (totalFrames / Math.max(0.01, totalTimeSec)).toFixed(1);

          if (decDOM.valFrames) decDOM.valFrames.textContent = totalFrames;
          if (decDOM.valSpeed) decDOM.valSpeed.textContent = `${avgFps} FPS`;
          if (decDOM.metricsBar) decDOM.metricsBar.style.display = 'flex';

          if (decDOM.progressStatus) {
            decDOM.progressStatus.innerHTML = '<i class="fa-solid fa-circle-check" style="color: var(--accent-emerald);"></i> Decryption Complete!';
          }

          decState.isProcessing = false;
          decDOM.btnProcess.disabled = false;
          if (decDOM.btnCancel) decDOM.btnCancel.style.display = 'none';
        };

        recorder.start();

        let frameIdx = 0;
        const streamInterval = 1000 / targetFps;
        const playTimer = setInterval(() => {
          if (frameIdx < processedFrames.length && !decState.cancelRequested) {
            recCtx.putImageData(processedFrames[frameIdx], 0, 0);
            frameIdx++;
          } else {
            clearInterval(playTimer);
            setTimeout(() => {
              if (recorder.state !== 'inactive') recorder.stop();
            }, 150);
          }
        }, streamInterval);
      });
    }

    if (decDOM.btnCancel) {
      decDOM.btnCancel.addEventListener('click', () => {
        decState.cancelRequested = true;
      });
    }

    // Synchronized Dual Playback Controls (Decrypt Tab)
    if (decDOM.btnSyncPlay) {
      decDOM.btnSyncPlay.addEventListener('click', () => {
        decDOM.resultPlayer.currentTime = decDOM.origPlayer.currentTime;
        decDOM.origPlayer.play();
        decDOM.resultPlayer.play();
      });
    }

    if (decDOM.btnSyncPause) {
      decDOM.btnSyncPause.addEventListener('click', () => {
        decDOM.origPlayer.pause();
        decDOM.resultPlayer.pause();
      });
    }

    if (decDOM.btnSyncReset) {
      decDOM.btnSyncReset.addEventListener('click', () => {
        decDOM.origPlayer.pause();
        decDOM.resultPlayer.pause();
        decDOM.origPlayer.currentTime = 0;
        decDOM.resultPlayer.currentTime = 0;
      });
    }

    if (decDOM.origPlayer) {
      decDOM.origPlayer.addEventListener('timeupdate', () => {
        const cur = decDOM.origPlayer.currentTime;
        const dur = decDOM.origPlayer.duration || 0;
        if (decDOM.origTime) decDOM.origTime.textContent = `${cur.toFixed(1)}s / ${dur.toFixed(1)}s`;
      });
    }

    if (decDOM.resultPlayer) {
      decDOM.resultPlayer.addEventListener('timeupdate', () => {
        const cur = decDOM.resultPlayer.currentTime;
        const dur = decDOM.resultPlayer.duration || 0;
        if (decDOM.resultTime) decDOM.resultTime.textContent = `${cur.toFixed(1)}s / ${dur.toFixed(1)}s`;
      });
    }

    if (decDOM.btnDownload) {
      decDOM.btnDownload.addEventListener('click', () => {
        if (!decState.processedBlob) return;
        const link = document.createElement('a');
        link.href = decState.processedUrl;
        link.download = `restored_video_${Date.now()}.webm`;
        link.click();
      });
    }
  }

  // Initialize both video modules
  initVideoEncryptModule();
  initVideoDecryptModule();

});
