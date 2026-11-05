/**
 * FYP Bit Engine - 3-Stage Reversible Image Cryptosystem & Steganography Library
 * 
 * Architecture:
 * 1. Stage 1: Pixel Permutation (Deterministic Fisher-Yates shuffle seeded by password)
 * 2. Stage 2: RGB Channel Permutation (Per-pixel 6-permutation color rotation)
 * 3. Stage 3: 2-MSB XOR Encryption (XOR top 2 bits b7b6 with 2-bit keystream, keeping lower 6 bits unchanged)
 * 
 * Decryption reverses the stages in exact reverse order:
 * Undo 2-MSB XOR -> Undo RGB Channel Permutation -> Undo Pixel Permutation
 */

const BitEngine = {
  
  // 6 Permutations of RGB color channels (3! = 6)
  CHANNEL_PERMS: [
    [0, 1, 2], // 0: R, G, B (Identity)
    [0, 2, 1], // 1: R, B, G
    [1, 0, 2], // 2: G, R, B
    [1, 2, 0], // 3: G, B, R
    [2, 0, 1], // 4: B, R, G
    [2, 1, 0]  // 5: B, G, R
  ],

  // Inverse permutations corresponding to CHANNEL_PERMS
  INV_CHANNEL_PERMS: [
    [0, 1, 2], // 0: inv of [0, 1, 2] -> [0, 1, 2]
    [0, 2, 1], // 1: inv of [0, 2, 1] -> [0, 2, 1]
    [1, 0, 2], // 2: inv of [1, 0, 2] -> [1, 0, 2]
    [2, 0, 1], // 3: inv of [1, 2, 0] -> [2, 0, 1]
    [1, 2, 0], // 4: inv of [2, 0, 1] -> [1, 2, 0]
    [2, 1, 0]  // 5: inv of [2, 1, 0] -> [2, 1, 0]
  ],

  /**
   * 2-MSB XOR Operation
   * Takes the top 2 MSB bits (b7, b6) and XORs them with key2 (0..3),
   * leaving lower 6 bits (b5..b0) unchanged.
   * @param {number} byte (0 - 255)
   * @param {number} key2 (0 - 3)
   * @returns {number} (0 - 255)
   */
  xor2MSB(byte, key2) {
    const msb = (byte >> 6) & 0x03;
    const newMsb = (msb ^ (key2 & 0x03)) & 0x03;
    return (byte & 0x3F) | (newMsb << 6);
  },

  /**
   * Helper bit-swap method for inspector / backwards compatibility
   */
  swapMSB(byte) {
    const msb = (byte >> 6) & 0x03;
    let newMsb = msb;
    if (msb === 2) newMsb = 1;
    else if (msb === 1) newMsb = 2;
    return (byte & 0x3F) | (newMsb << 6);
  },

  /**
   * Derive a 256-bit cryptographic key from an image file or buffer
   * Hashes the exact binary bytes of the key image with SHA-256 for bit-exact reproducibility.
   * @param {File|Blob|ArrayBuffer} fileOrBuffer
   * @returns {Promise<{hex: string, displayHash: string, fullHash: string, hashBuffer: ArrayBuffer, hash32: Uint32Array}>}
   */
  async hashKeyImage(fileOrBuffer) {
    let buffer;
    if (fileOrBuffer instanceof ArrayBuffer) {
      buffer = fileOrBuffer;
    } else if (fileOrBuffer && typeof fileOrBuffer.arrayBuffer === 'function') {
      buffer = await fileOrBuffer.arrayBuffer();
    } else {
      throw new Error("Invalid key image format");
    }
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return {
      hex: "IMG_KEY:" + hex,
      displayHash: hex.substring(0, 12) + '...' + hex.substring(hex.length - 8),
      fullHash: hex,
      hashBuffer,
      hash32: new Uint32Array(hashBuffer)
    };
  },

  /**
   * Generate SHA-256 seeded deterministic PRNG (Xoshiro128**)
   * Produces 100% reproducible pseudo-random numbers from password.
   * @param {string} password 
   * @param {string} salt
   * @returns {Promise<{nextUint32: Function, nextInt: Function, nextByte: Function, next2Bits: Function}>}
   */
  async createPRNG(password, salt = "") {
    const encoder = new TextEncoder();
    const keyString = (password && password.length > 0 ? password : "DEFAULT_FYP_SEED_KEY_2026") + ":" + salt;
    const data = encoder.encode(keyString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hash32 = new Uint32Array(hashBuffer);

    let s0 = hash32[0] || 0x12345678;
    let s1 = hash32[1] || 0x9abcdef0;
    let s2 = hash32[2] || 0x0fedcba9;
    let s3 = hash32[3] || 0x87654321;

    function rotl(x, k) {
      return ((x << k) | (x >>> (32 - k))) >>> 0;
    }

    return {
      nextUint32() {
        const result = Math.imul(rotl(s1 * 5, 7), 9) >>> 0;
        const t = s1 << 9;
        s2 ^= s0;
        s3 ^= s1;
        s1 ^= s2;
        s0 ^= s3;
        s2 ^= t;
        s3 = rotl(s3, 11);
        return result;
      },
      nextInt(max) {
        if (max <= 1) return 0;
        return (this.nextUint32() % max) >>> 0;
      },
      nextByte() {
        return (this.nextUint32() & 0xFF);
      },
      next2Bits() {
        return (this.nextUint32() & 0x03);
      }
    };
  },

  /**
   * Keystream generator for Steganography
   */
  async createKeystream(password) {
    const prng = await this.createPRNG(password, "STEGANO_STREAM");
    return function getNextKeyByte() {
      return prng.nextByte();
    };
  },

  /**
   * Extract active pixel indices (within contour mask, bounding boxes, or full image)
   * @param {ImageData} imageData 
   * @param {Uint8Array|Array<number>|Array<{x: number, y: number, width: number, height: number}>|null} maskOrRegions 
   * @returns {Int32Array}
   */
  getTargetPixelIndices(imageData, maskOrRegions) {
    const totalPixels = imageData.data.length / 4;
    const imgWidth = imageData.width;

    const isPixelMask = maskOrRegions && (
      maskOrRegions instanceof Uint8Array ||
      maskOrRegions instanceof Uint8ClampedArray ||
      (Array.isArray(maskOrRegions) && typeof maskOrRegions[0] === 'number')
    ) && maskOrRegions.length === totalPixels;

    let regionList = [];
    if (!isPixelMask && maskOrRegions) {
      if (Array.isArray(maskOrRegions)) {
        regionList = maskOrRegions.filter(r => r && r.width > 0 && r.height > 0);
      } else if (maskOrRegions.width > 0 && maskOrRegions.height > 0) {
        regionList = [maskOrRegions];
      }
    }
    const hasRegions = regionList.length > 0;

    const indices = [];
    for (let i = 0; i < totalPixels; i++) {
      if (isPixelMask) {
        if (maskOrRegions[i] > 0) indices.push(i);
      } else if (hasRegions) {
        const px = i % imgWidth;
        const py = Math.floor(i / imgWidth);
        let inRegion = false;
        for (let r = 0; r < regionList.length; r++) {
          const reg = regionList[r];
          const rx = Math.min(reg.x, reg.x + reg.width);
          const ry = Math.min(reg.y, reg.y + reg.height);
          const rw = Math.abs(reg.width);
          const rh = Math.abs(reg.height);
          if (px >= rx && px <= rx + rw && py >= ry && py <= ry + rh) {
            inRegion = true;
            break;
          }
        }
        if (inRegion) indices.push(i);
      } else {
        indices.push(i); // Full image
      }
    }
    return new Int32Array(indices);
  },

  /**
   * 3-Stage Reversible Image Encryption:
   * Original Image -> Pixel Permutation -> RGB Channel Permutation -> 2-MSB XOR -> Encrypted Image
   * @param {ImageData} imageData 
   * @param {string} password 
   * @param {Uint8Array|Array|null} maskOrRegions 
   * @returns {Promise<{imageData: ImageData, swappedCount: number, mse: number, psnr: number}>}
   */
  async encryptImage(imageData, password, maskOrRegions = null) {
    const data = imageData.data; // RGBA buffer
    const originalCopy = new Uint8ClampedArray(data);

    // 1. Determine active target pixel indices
    const targetIndices = this.getTargetPixelIndices(imageData, maskOrRegions);
    const M = targetIndices.length;

    if (M === 0) {
      return { imageData, swappedCount: 0, mse: 0, psnr: '∞' };
    }

    // Initialize deterministic PRNGs for the 3 stages
    const prngPixel = await this.createPRNG(password, "STAGE1_PIXEL_PERM");
    const prngChannel = await this.createPRNG(password, "STAGE2_CHANNEL_PERM");
    const prngXor = await this.createPRNG(password, "STAGE3_MSB_XOR");

    // === STAGE 1: PIXEL PERMUTATION (Fisher-Yates Shuffle) ===
    const perm = new Int32Array(M);
    for (let i = 0; i < M; i++) perm[i] = i;
    for (let i = M - 1; i > 0; i--) {
      const j = prngPixel.nextInt(i + 1);
      const temp = perm[i];
      perm[i] = perm[j];
      perm[j] = temp;
    }

    // Temporary buffer to hold spatially permuted pixels
    const stage1Data = new Uint8ClampedArray(data);
    for (let k = 0; k < M; k++) {
      const srcIdx = targetIndices[k] * 4;
      const dstIdx = targetIndices[perm[k]] * 4;
      stage1Data[dstIdx] = data[srcIdx];         // R
      stage1Data[dstIdx + 1] = data[srcIdx + 1]; // G
      stage1Data[dstIdx + 2] = data[srcIdx + 2]; // B
      stage1Data[dstIdx + 3] = data[srcIdx + 3]; // A
    }

    // === STAGE 2: RGB CHANNEL PERMUTATION ===
    const stage2Data = new Uint8ClampedArray(stage1Data);
    for (let k = 0; k < M; k++) {
      const pixelIdx = targetIndices[k] * 4;
      const r = stage1Data[pixelIdx];
      const g = stage1Data[pixelIdx + 1];
      const b = stage1Data[pixelIdx + 2];
      const rgb = [r, g, b];

      const permId = prngChannel.nextInt(6);
      const pOrder = this.CHANNEL_PERMS[permId];

      stage2Data[pixelIdx] = rgb[pOrder[0]];
      stage2Data[pixelIdx + 1] = rgb[pOrder[1]];
      stage2Data[pixelIdx + 2] = rgb[pOrder[2]];
    }

    // === STAGE 3: 2-MSB XOR ENCRYPTION ===
    let swappedCount = 0;
    let totalDiffSq = 0;
    let channelCount = 0;

    for (let k = 0; k < M; k++) {
      const pixelIdx = targetIndices[k] * 4;
      for (let c = 0; c < 3; c++) {
        const idx = pixelIdx + c;
        const originalByte = originalCopy[idx];
        const currentByte = stage2Data[idx];
        const key2 = prngXor.next2Bits();

        const newByte = this.xor2MSB(currentByte, key2);
        data[idx] = newByte;

        if (newByte !== originalByte) {
          swappedCount++;
        }
        const diff = originalByte - newByte;
        totalDiffSq += diff * diff;
        channelCount++;
      }
    }

    const mse = channelCount > 0 ? (totalDiffSq / channelCount) : 0;
    const psnr = mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);

    return {
      imageData,
      swappedCount,
      mse: parseFloat(mse.toFixed(4)),
      psnr: psnr === Infinity ? '∞' : parseFloat(psnr.toFixed(2))
    };
  },

  /**
   * 3-Stage Reversible Image Decryption:
   * Encrypted Image -> Undo 2-MSB XOR -> Undo RGB Channel Permutation -> Undo Pixel Permutation -> Original Image
   * @param {ImageData} imageData 
   * @param {string} password 
   * @param {Uint8Array|Array|null} maskOrRegions 
   * @returns {Promise<{imageData: ImageData, swappedCount: number, mse: number, psnr: number}>}
   */
  async decryptImage(imageData, password, maskOrRegions = null) {
    const data = imageData.data; // RGBA buffer
    const inputCopy = new Uint8ClampedArray(data);

    // 1. Determine active target pixel indices
    const targetIndices = this.getTargetPixelIndices(imageData, maskOrRegions);
    const M = targetIndices.length;

    if (M === 0) {
      return { imageData, swappedCount: 0, mse: 0, psnr: '∞' };
    }

    // Same PRNGs seeded by password with the same salts
    const prngPixel = await this.createPRNG(password, "STAGE1_PIXEL_PERM");
    const prngChannel = await this.createPRNG(password, "STAGE2_CHANNEL_PERM");
    const prngXor = await this.createPRNG(password, "STAGE3_MSB_XOR");

    // === REVERSE STAGE 3: UNDO 2-MSB XOR ENCRYPTION ===
    const unXorData = new Uint8ClampedArray(data);
    for (let k = 0; k < M; k++) {
      const pixelIdx = targetIndices[k] * 4;
      for (let c = 0; c < 3; c++) {
        const idx = pixelIdx + c;
        const key2 = prngXor.next2Bits();
        // Since XOR is its own inverse, XORing again with key2 restores pre-XOR byte
        unXorData[idx] = this.xor2MSB(data[idx], key2);
      }
    }

    // === REVERSE STAGE 2: UNDO RGB CHANNEL PERMUTATION ===
    const unChannelData = new Uint8ClampedArray(unXorData);
    for (let k = 0; k < M; k++) {
      const pixelIdx = targetIndices[k] * 4;
      const r = unXorData[pixelIdx];
      const g = unXorData[pixelIdx + 1];
      const b = unXorData[pixelIdx + 2];
      const rgb = [r, g, b];

      const permId = prngChannel.nextInt(6);
      const invOrder = this.INV_CHANNEL_PERMS[permId];

      unChannelData[pixelIdx] = rgb[invOrder[0]];
      unChannelData[pixelIdx + 1] = rgb[invOrder[1]];
      unChannelData[pixelIdx + 2] = rgb[invOrder[2]];
    }

    // === REVERSE STAGE 1: UNDO PIXEL PERMUTATION ===
    // Generate the exact same Fisher-Yates permutation array
    const perm = new Int32Array(M);
    for (let i = 0; i < M; i++) perm[i] = i;
    for (let i = M - 1; i > 0; i--) {
      const j = prngPixel.nextInt(i + 1);
      const temp = perm[i];
      perm[i] = perm[j];
      perm[j] = temp;
    }

    // Reverse permutation: move pixels from shuffled position back to original position
    for (let k = 0; k < M; k++) {
      const srcIdx = targetIndices[perm[k]] * 4;
      const dstIdx = targetIndices[k] * 4;
      data[dstIdx] = unChannelData[srcIdx];         // R
      data[dstIdx + 1] = unChannelData[srcIdx + 1]; // G
      data[dstIdx + 2] = unChannelData[srcIdx + 2]; // B
      data[dstIdx + 3] = unChannelData[srcIdx + 3]; // A
    }

    // Calculate quality metrics comparing encrypted input vs restored output
    let swappedCount = 0;
    let totalDiffSq = 0;
    let channelCount = 0;

    for (let k = 0; k < M; k++) {
      const pixelIdx = targetIndices[k] * 4;
      for (let c = 0; c < 3; c++) {
        const idx = pixelIdx + c;
        const beforeByte = inputCopy[idx];
        const afterByte = data[idx];
        if (beforeByte !== afterByte) {
          swappedCount++;
        }
        const diff = beforeByte - afterByte;
        totalDiffSq += diff * diff;
        channelCount++;
      }
    }

    const mse = channelCount > 0 ? (totalDiffSq / channelCount) : 0;
    const psnr = mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);

    return {
      imageData,
      swappedCount,
      mse: parseFloat(mse.toFixed(4)),
      psnr: psnr === Infinity ? '∞' : parseFloat(psnr.toFixed(2))
    };
  },

  /**
   * Unified dispatcher for processing (enc/dec)
   */
  async processImage(imageData, password, maskOrRegions = null, isDecrypt = false) {
    if (isDecrypt) {
      return this.decryptImage(imageData, password, maskOrRegions);
    }
    return this.encryptImage(imageData, password, maskOrRegions);
  },

  /**
   * Compare two ImageData buffers and compute MSE, PSNR, and difference stats
   * @param {ImageData} dataA 
   * @param {ImageData} dataB 
   * @returns {{mse: number, psnr: number|string, diffCount: number, channelCount: number}}
   */
  calculateMetrics(dataA, dataB) {
    if (!dataA || !dataB || dataA.data.length !== dataB.data.length) {
      return { mse: 0, psnr: '∞', diffCount: 0, channelCount: 0 };
    }
    const bufA = dataA.data;
    const bufB = dataB.data;
    let totalDiffSq = 0;
    let diffCount = 0;
    let channelCount = 0;

    for (let i = 0; i < bufA.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const diff = bufA[i + c] - bufB[i + c];
        if (diff !== 0) diffCount++;
        totalDiffSq += diff * diff;
        channelCount++;
      }
    }

    const mse = channelCount > 0 ? (totalDiffSq / channelCount) : 0;
    const psnr = mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);

    return {
      mse: parseFloat(mse.toFixed(4)),
      psnr: psnr === Infinity ? '∞' : parseFloat(psnr.toFixed(2)),
      diffCount,
      channelCount
    };
  },

  /**
   * Steganography: Embed text payload into LSB bits of ImageData
   * @param {ImageData} imageData 
   * @param {string} textPayload 
   * @param {string} password 
   * @returns {Promise<ImageData>}
   */
  async embedStegoPayload(imageData, textPayload, password) {
    const data = imageData.data;
    const getKeyByte = await this.createKeystream(password);

    // Convert text payload to byte array
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(textPayload);
    
    // Header: 4 bytes (32-bit uint) holding length of payload
    const len = payloadBytes.length;
    const fullBuffer = new Uint8Array(4 + len);
    fullBuffer[0] = (len >> 24) & 0xFF;
    fullBuffer[1] = (len >> 16) & 0xFF;
    fullBuffer[2] = (len >> 8) & 0xFF;
    fullBuffer[3] = len & 0xFF;
    fullBuffer.set(payloadBytes, 4);

    // XOR encrypt payload buffer with password keystream
    for (let i = 0; i < fullBuffer.length; i++) {
      fullBuffer[i] ^= getKeyByte();
    }

    // Convert fullBuffer into binary bitstream
    let bits = [];
    for (let b of fullBuffer) {
      for (let shift = 7; shift >= 0; shift--) {
        bits.push((b >> shift) & 1);
      }
    }

    const maxBits = (data.length / 4) * 3; // 1 bit per RGB channel
    if (bits.length > maxBits) {
      throw new Error(`Text message too long! Max length for this image is ${Math.floor((maxBits - 32)/8)} characters.`);
    }

    let bitIdx = 0;
    for (let i = 0; i < data.length && bitIdx < bits.length; i += 4) {
      for (let c = 0; c < 3 && bitIdx < bits.length; c++) {
        const idx = i + c;
        const bitToHide = bits[bitIdx++];
        // Replace bit b0 of channel
        data[idx] = (data[idx] & 0xFE) | bitToHide;
      }
    }

    return imageData;
  },

  /**
   * Steganography: Extract text payload from LSB bits of ImageData
   * @param {ImageData} imageData 
   * @param {string} password 
   * @returns {Promise<string>}
   */
  async extractStegoPayload(imageData, password) {
    const data = imageData.data;
    const getKeyByte = await this.createKeystream(password);

    // Extract raw bitstream from LSB (b0) of RGB channels
    let bits = [];
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        bits.push(data[i + c] & 1);
      }
    }

    // Read first 32 bits for length header
    if (bits.length < 32) {
      throw new Error("Image too small to contain valid stego payload.");
    }

    let rawHeaderBytes = new Uint8Array(4);
    for (let byteIdx = 0; byteIdx < 4; byteIdx++) {
      let b = 0;
      for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
        b = (b << 1) | bits[byteIdx * 8 + bitIdx];
      }
      rawHeaderBytes[byteIdx] = b ^ getKeyByte();
    }

    const payloadLen = (rawHeaderBytes[0] << 24) | (rawHeaderBytes[1] << 16) | (rawHeaderBytes[2] << 8) | rawHeaderBytes[3];

    if (payloadLen <= 0 || payloadLen > (bits.length - 32) / 8) {
      throw new Error("Invalid payload length or incorrect password.");
    }

    let rawPayloadBytes = new Uint8Array(payloadLen);
    const startBitOffset = 32;

    for (let byteIdx = 0; byteIdx < payloadLen; byteIdx++) {
      let b = 0;
      for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
        b = (b << 1) | bits[startBitOffset + byteIdx * 8 + bitIdx];
      }
      rawPayloadBytes[byteIdx] = b ^ getKeyByte();
    }

    const decoder = new TextDecoder('utf-8');
    return decoder.decode(rawPayloadBytes);
  },

  /**
   * Convert Byte into 8-bit binary string padded with zeros
   * @param {number} byte 
   * @returns {string} e.g. "10100001"
   */
  toBinary8(byte) {
    return byte.toString(2).padStart(8, '0');
  },

  /**
   * Derive a fast 256-bit cryptographic master key from password for video stream processing
   * @param {string} password
   * @returns {Promise<Uint32Array>} 8 uint32 values
   */
  async createFastMasterKey(password) {
    const encoder = new TextEncoder();
    const keyString = (password && password.length > 0 ? password : "DEFAULT_FYP_VIDEO_KEY_2026") + ":VIDEO_STREAM_SEED";
    const data = encoder.encode(keyString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint32Array(hashBuffer);
  },

  /**
   * Fast synchronous PRNG for frame-by-frame encryption (Xoshiro128**)
   * Seeding deterministically combines master key with frame index & stage identifier.
   */
  getFramePRNG(master32, frameIndex, stageId = 0) {
    let s0 = (master32[0] ^ (frameIndex * 0x9E3779B9 + stageId * 0x85EBCA6B)) >>> 0;
    let s1 = (master32[1] ^ (frameIndex * 0xC2B2AE35 + stageId * 0x7F4A7C15)) >>> 0;
    let s2 = (master32[2] ^ (frameIndex * 0x27D4EB2F + stageId * 0x165667B1)) >>> 0;
    let s3 = (master32[3] ^ (frameIndex * 0x9E3779B9 ^ (master32[4] || 0x12345678))) >>> 0;

    if ((s0 | s1 | s2 | s3) === 0) {
      s0 = 0x12345678; s1 = 0x9abcdef0; s2 = 0x0fedcba9; s3 = 0x87654321;
    }

    function rotl(x, k) {
      return ((x << k) | (x >>> (32 - k))) >>> 0;
    }

    return {
      nextUint32() {
        const result = Math.imul(rotl(s1 * 5, 7), 9) >>> 0;
        const t = s1 << 9;
        s2 ^= s0;
        s3 ^= s1;
        s1 ^= s2;
        s0 ^= s3;
        s2 ^= t;
        s3 = rotl(s3, 11);
        return result;
      },
      nextInt(max) {
        if (max <= 1) return 0;
        return (this.nextUint32() % max) >>> 0;
      },
      nextByte() {
        return (this.nextUint32() & 0xFF);
      },
      next2Bits() {
        return (this.nextUint32() & 0x03);
      }
    };
  },

  /**
   * Encrypt a single video frame with high throughput
   * Supports: '3stage' (Pixel shuffle + RGB perm + 2-MSB XOR), '2msb' (High speed MSB keystream), or 'block' (Macroblock 16x16 shuffle + 2-MSB XOR)
   */
  encryptVideoFrame(imageData, master32, frameIndex, mode = '3stage', cachedPerm = null) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const totalPixels = width * height;

    let swappedCount = 0;
    let totalDiffSq = 0;

    if (mode === '2msb') {
      // High-speed 2-MSB XOR Stream Cipher
      const prng = this.getFramePRNG(master32, frameIndex, 3);
      for (let i = 0; i < totalPixels; i++) {
        const px = i * 4;
        const keyVal = prng.nextUint32();
        for (let c = 0; c < 3; c++) {
          const idx = px + c;
          const orig = data[idx];
          const key2 = (keyVal >>> (c * 2)) & 0x03;
          const enc = this.xor2MSB(orig, key2);
          data[idx] = enc;
          if (enc !== orig) swappedCount++;
          const diff = orig - enc;
          totalDiffSq += diff * diff;
        }
      }
    } else if (mode === 'block') {
      // Macroblock tile permutation (16x16) + 2-MSB XOR
      const blockSize = 16;
      const cols = Math.floor(width / blockSize);
      const rows = Math.floor(height / blockSize);
      const numBlocks = cols * rows;

      const prngBlock = this.getFramePRNG(master32, frameIndex, 1);
      const prngXor = this.getFramePRNG(master32, frameIndex, 3);

      const blockPerm = new Int32Array(numBlocks);
      for (let b = 0; b < numBlocks; b++) blockPerm[b] = b;
      for (let b = numBlocks - 1; b > 0; b--) {
        const j = prngBlock.nextInt(b + 1);
        const tmp = blockPerm[b];
        blockPerm[b] = blockPerm[j];
        blockPerm[j] = tmp;
      }

      const srcData = new Uint8ClampedArray(data);
      for (let srcB = 0; srcB < numBlocks; srcB++) {
        const dstB = blockPerm[srcB];
        const srcCol = srcB % cols;
        const srcRow = Math.floor(srcB / cols);
        const dstCol = dstB % cols;
        const dstRow = Math.floor(dstB / cols);

        for (let by = 0; by < blockSize; by++) {
          const srcY = srcRow * blockSize + by;
          const dstY = dstRow * blockSize + by;
          for (let bx = 0; bx < blockSize; bx++) {
            const srcX = srcCol * blockSize + bx;
            const dstX = dstCol * blockSize + bx;
            const srcIdx = (srcY * width + srcX) * 4;
            const dstIdx = (dstY * width + dstX) * 4;

            data[dstIdx] = srcData[srcIdx];
            data[dstIdx + 1] = srcData[srcIdx + 1];
            data[dstIdx + 2] = srcData[srcIdx + 2];
            data[dstIdx + 3] = srcData[srcIdx + 3];
          }
        }
      }

      for (let i = 0; i < totalPixels; i++) {
        const px = i * 4;
        const keyVal = prngXor.nextUint32();
        for (let c = 0; c < 3; c++) {
          const idx = px + c;
          const orig = srcData[idx];
          const cur = data[idx];
          const key2 = (keyVal >>> (c * 2)) & 0x03;
          const enc = this.xor2MSB(cur, key2);
          data[idx] = enc;
          if (enc !== orig) swappedCount++;
          const diff = orig - enc;
          totalDiffSq += diff * diff;
        }
      }
    } else {
      // mode === '3stage' (Full Pixel Shuffle + RGB Perm + 2-MSB XOR)
      const prngPixel = this.getFramePRNG(master32, frameIndex, 1);
      const prngChannel = this.getFramePRNG(master32, frameIndex, 2);
      const prngXor = this.getFramePRNG(master32, frameIndex, 3);

      let perm = cachedPerm;
      if (!perm || perm.length !== totalPixels) {
        perm = new Int32Array(totalPixels);
        for (let i = 0; i < totalPixels; i++) perm[i] = i;
        for (let i = totalPixels - 1; i > 0; i--) {
          const j = prngPixel.nextInt(i + 1);
          const tmp = perm[i];
          perm[i] = perm[j];
          perm[j] = tmp;
        }
      }

      const origData = new Uint8ClampedArray(data);
      const permData = new Uint8ClampedArray(data);

      for (let i = 0; i < totalPixels; i++) {
        const src = i * 4;
        const dst = perm[i] * 4;
        permData[dst] = origData[src];
        permData[dst + 1] = origData[src + 1];
        permData[dst + 2] = origData[src + 2];
        permData[dst + 3] = origData[src + 3];
      }

      for (let i = 0; i < totalPixels; i++) {
        const px = i * 4;
        const r = permData[px];
        const g = permData[px + 1];
        const b = permData[px + 2];
        const rgb = [r, g, b];

        const permId = prngChannel.nextInt(6);
        const pOrder = this.CHANNEL_PERMS[permId];

        const k2R = prngXor.next2Bits();
        const k2G = prngXor.next2Bits();
        const k2B = prngXor.next2Bits();

        const encR = this.xor2MSB(rgb[pOrder[0]], k2R);
        const encG = this.xor2MSB(rgb[pOrder[1]], k2G);
        const encB = this.xor2MSB(rgb[pOrder[2]], k2B);

        data[px] = encR;
        data[px + 1] = encG;
        data[px + 2] = encB;

        const origR = origData[px];
        const origG = origData[px + 1];
        const origB = origData[px + 2];

        if (encR !== origR) swappedCount++;
        if (encG !== origG) swappedCount++;
        if (encB !== origB) swappedCount++;

        totalDiffSq += (origR - encR) * (origR - encR);
        totalDiffSq += (origG - encG) * (origG - encG);
        totalDiffSq += (origB - encB) * (origB - encB);
      }
    }

    const channelCount = totalPixels * 3;
    const mse = channelCount > 0 ? (totalDiffSq / channelCount) : 0;
    const psnr = mse === 0 ? Infinity : 10 * Math.log10((255 * 255) / mse);

    return {
      swappedCount,
      mse: parseFloat(mse.toFixed(2)),
      psnr: psnr === Infinity ? '∞' : parseFloat(psnr.toFixed(2))
    };
  },

  /**
   * Decrypt a single video frame in reverse
   */
  decryptVideoFrame(imageData, master32, frameIndex, mode = '3stage', cachedPerm = null) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const totalPixels = width * height;

    if (mode === '2msb') {
      const prng = this.getFramePRNG(master32, frameIndex, 3);
      for (let i = 0; i < totalPixels; i++) {
        const px = i * 4;
        const keyVal = prng.nextUint32();
        for (let c = 0; c < 3; c++) {
          const idx = px + c;
          const key2 = (keyVal >>> (c * 2)) & 0x03;
          data[idx] = this.xor2MSB(data[idx], key2);
        }
      }
    } else if (mode === 'block') {
      const blockSize = 16;
      const cols = Math.floor(width / blockSize);
      const rows = Math.floor(height / blockSize);
      const numBlocks = cols * rows;

      const prngBlock = this.getFramePRNG(master32, frameIndex, 1);
      const prngXor = this.getFramePRNG(master32, frameIndex, 3);

      for (let i = 0; i < totalPixels; i++) {
        const px = i * 4;
        const keyVal = prngXor.nextUint32();
        for (let c = 0; c < 3; c++) {
          const idx = px + c;
          const key2 = (keyVal >>> (c * 2)) & 0x03;
          data[idx] = this.xor2MSB(data[idx], key2);
        }
      }

      const blockPerm = new Int32Array(numBlocks);
      for (let b = 0; b < numBlocks; b++) blockPerm[b] = b;
      for (let b = numBlocks - 1; b > 0; b--) {
        const j = prngBlock.nextInt(b + 1);
        const tmp = blockPerm[b];
        blockPerm[b] = blockPerm[j];
        blockPerm[j] = tmp;
      }

      const copy = new Uint8ClampedArray(data);
      for (let srcB = 0; srcB < numBlocks; srcB++) {
        const dstB = blockPerm[srcB];
        const srcCol = srcB % cols;
        const srcRow = Math.floor(srcB / cols);
        const dstCol = dstB % cols;
        const dstRow = Math.floor(dstB / cols);

        for (let by = 0; by < blockSize; by++) {
          const origY = srcRow * blockSize + by;
          const encY = dstRow * blockSize + by;
          for (let bx = 0; bx < blockSize; bx++) {
            const origX = srcCol * blockSize + bx;
            const encX = dstCol * blockSize + bx;
            const encIdx = (encY * width + encX) * 4;
            const origIdx = (origY * width + origX) * 4;

            data[origIdx] = copy[encIdx];
            data[origIdx + 1] = copy[encIdx + 1];
            data[origIdx + 2] = copy[encIdx + 2];
            data[origIdx + 3] = copy[encIdx + 3];
          }
        }
      }
    } else {
      const prngPixel = this.getFramePRNG(master32, frameIndex, 1);
      const prngChannel = this.getFramePRNG(master32, frameIndex, 2);
      const prngXor = this.getFramePRNG(master32, frameIndex, 3);

      let perm = cachedPerm;
      if (!perm || perm.length !== totalPixels) {
        perm = new Int32Array(totalPixels);
        for (let i = 0; i < totalPixels; i++) perm[i] = i;
        for (let i = totalPixels - 1; i > 0; i--) {
          const j = prngPixel.nextInt(i + 1);
          const tmp = perm[i];
          perm[i] = perm[j];
          perm[j] = tmp;
        }
      }

      const unChannelData = new Uint8ClampedArray(data.length);
      for (let i = 0; i < totalPixels; i++) {
        const px = i * 4;
        const k2R = prngXor.next2Bits();
        const k2G = prngXor.next2Bits();
        const k2B = prngXor.next2Bits();

        const unXorR = this.xor2MSB(data[px], k2R);
        const unXorG = this.xor2MSB(data[px + 1], k2G);
        const unXorB = this.xor2MSB(data[px + 2], k2B);
        const rgb = [unXorR, unXorG, unXorB];

        const permId = prngChannel.nextInt(6);
        const invOrder = this.INV_CHANNEL_PERMS[permId];

        unChannelData[px] = rgb[invOrder[0]];
        unChannelData[px + 1] = rgb[invOrder[1]];
        unChannelData[px + 2] = rgb[invOrder[2]];
        unChannelData[px + 3] = data[px + 3];
      }

      for (let i = 0; i < totalPixels; i++) {
        const src = perm[i] * 4;
        const dst = i * 4;
        data[dst] = unChannelData[src];
        data[dst + 1] = unChannelData[src + 1];
        data[dst + 2] = unChannelData[src + 2];
        data[dst + 3] = unChannelData[src + 3];
      }
    }

    return { success: true };
  }

};

window.BitEngine = BitEngine;
