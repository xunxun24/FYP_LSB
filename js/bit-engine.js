/**
 * FYP Bit Engine - Core Bitwise Manipulation & Steganography Library
 * Implements LSB (b1b0) and MSB (b7b6) deterministic bit-swap algorithms,
 * SHA-256 password stream cipher, and Steganography embedding/extraction.
 */

const BitEngine = {
  
  /**
   * Deterministic LSB Bit-Swap (Bits b1, b0)
   * 10 (2) <-> 01 (1), 00 and 11 stay unchanged.
   * @param {number} byte (0 - 255)
   * @returns {number} swapped byte (0 - 255)
   */
  swapLSB(byte) {
    const lsb = byte & 0x03; // Extract bits b1 b0
    let newLsb = lsb;
    if (lsb === 2) {       // '10' -> '01'
      newLsb = 1;
    } else if (lsb === 1) { // '01' -> '10'
      newLsb = 2;
    }
    return (byte & 0xFC) | newLsb;
  },

  /**
   * Deterministic MSB Bit-Swap (Bits b7, b6)
   * 10 (2) <-> 01 (1), 00 and 11 stay unchanged.
   * @param {number} byte (0 - 255)
   * @returns {number} swapped byte (0 - 255)
   */
  swapMSB(byte) {
    const msb = (byte >> 6) & 0x03; // Extract bits b7 b6
    let newMsb = msb;
    if (msb === 2) {       // '10' -> '01'
      newMsb = 1;
    } else if (msb === 1) { // '01' -> '10'
      newMsb = 2;
    }
    return (byte & 0x3F) | (newMsb << 6);
  },

  /**
   * Generate SHA-256 key stream generator from password string
   * @param {string} password 
   * @returns {Promise<Function>} function that returns next random byte (0-255)
   */
  async createKeystream(password) {
    if (!password || password.trim() === "") {
      // Return dummy key stream of all 1s (always swap)
      return () => 255;
    }
    
    // Hash password with SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    
    let index = 0;
    let state = new Uint8Array(hashArray);
    
    return function getNextKeyByte() {
      if (index >= state.length) {
        // Re-hash state for continuous pseudo-random stream
        index = 0;
        for (let i = 0; i < state.length; i++) {
          state[i] = (state[i] * 31 + 17) & 0xFF;
        }
      }
      return state[index++];
    };
  },

  /**
   * Process ImageData buffer for Encryption or Decryption
   * @param {ImageData} imageData 
   * @param {'lsb'|'msb'} mode 
   * @param {string} password 
   * @param {Array<{x: number, y: number, width: number, height: number}>|{x: number, y: number, width: number, height: number}|null} regions
   * @returns {Promise<{imageData: ImageData, swappedCount: number, mse: number, psnr: number}>}
   */
  async processImage(imageData, mode, password, regions = null) {
    const data = imageData.data; // RGBA buffer
    const copy = new Uint8ClampedArray(data);
    const getKeyByte = await this.createKeystream(password);
    
    let swappedCount = 0;
    let totalDiffSq = 0;
    let channelCount = 0;

    const imgWidth = imageData.width;

    // Normalize regions to array of bounding boxes
    let regionList = [];
    if (regions) {
      if (Array.isArray(regions)) {
        regionList = regions.filter(r => r && r.width > 0 && r.height > 0);
      } else if (regions.width > 0 && regions.height > 0) {
        regionList = [regions];
      }
    }
    const hasRegions = regionList.length > 0;

    for (let i = 0; i < data.length; i += 4) {
      const pixelIdx = i / 4;
      const px = pixelIdx % imgWidth;
      const py = Math.floor(pixelIdx / imgWidth);

      // Check if pixel is within any active target region
      let inRegion = !hasRegions;
      if (hasRegions) {
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
      }

      // Process Red, Green, Blue channels (skip Alpha at i+3)
      for (let c = 0; c < 3; c++) {
        const idx = i + c;
        const originalByte = copy[idx];
        const keyByte = getKeyByte();
        
        let newByte = originalByte;
        if (inRegion && (keyByte & 0x01) !== 0) {
          if (mode === 'lsb') {
            newByte = this.swapLSB(originalByte);
          } else if (mode === 'msb') {
            newByte = this.swapMSB(originalByte);
          }
        }

        if (newByte !== originalByte) {
          swappedCount++;
        }

        data[idx] = newByte;

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
  }

};

window.BitEngine = BitEngine;
