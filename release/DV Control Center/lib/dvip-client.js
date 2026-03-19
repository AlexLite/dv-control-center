const fs = require('fs');
const net = require('net');
const path = require('path');

const {
  encodeControlHeader,
  encodeValue,
  decodeValue,
  inferSection2DveType,
  withPacketSize,
} = require('./protocol-codec');

class DvipClient {
  constructor(catalog, hooks = {}, options = {}) {
    this.catalog = catalog;
    this.hooks = hooks || {};
    this.state = {};
    this.stateById = {};
    this.connection = { connected: false, host: null, realtimePort: null, commandPort: null };
    this.cmdSocket = null;
    this.rtSocket = null;
    this.sseClients = new Set();
    this.nullPacket = Buffer.from([0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    this.nullPacketCmd = Buffer.from([0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00]);
    this.filterPacket = Buffer.from([0x08, 0x00, 0x00, 0x00, 0x30, 0x4e, 0x13, 0x00]);
    this.cmdRx = Buffer.alloc(0);
    this.rtRx = Buffer.alloc(0);
    const dataDir = options.dataDir || path.join(process.cwd(), 'data');
    this.stateCachePath = path.join(dataDir, 'state-cache.json');
    this.connectionConfigPath = path.join(dataDir, 'connection-config.json');
    this.persistTimer = null;
    this.pendingInputNameRequests = [];
    this.sseHeartbeatTimer = null;
    this.sseHeartbeatMs = 15000;
    this.savedConnectionConfig = this.loadConnectionConfig();
    this.loadStateCache();
    this.hasFlexCatalog = !!(
      this.catalog
      && this.catalog.byLabel
      && (
        this.catalog.byLabel.get('SWITCHER_FLEX_SRC_BGND_SRC')
        || this.catalog.byLabel.get('SWITCHER_FLEX_SRC_DVE1_SRC')
      )
    );
  }

  connect({ host, realtimePort = 5001, commandPort = 5002 }) {
    this.disconnect();
    this.connection = { connected: false, host, realtimePort, commandPort };

    this.cmdSocket = net.createConnection({ host, port: commandPort }, () => {
      this.connection.connected = true;
      this.saveConnectionConfig(this.connection);
      this.cmdSocket.write(this.nullPacket);
      setTimeout(() => {
        try {
          if (this.connection.connected) this.requestStateSnapshot();
        } catch (err) {
          this.broadcast({ type: 'error', data: `Snapshot request failed: ${err.message}` });
        }
      }, 250);
      setTimeout(() => {
        try {
          if (this.connection.connected) this.requestAllInputNames(12);
        } catch (err) {
          this.broadcast({ type: 'error', data: `Input name request failed: ${err.message}` });
        }
      }, 600);
      this.broadcast({ type: 'connection', data: this.connection });
    });

    this.cmdSocket.on('data', (buf) => this.handleSocketData('cmd', buf));
    this.cmdSocket.on('error', (err) => this.broadcast({ type: 'error', data: err.message }));
    this.cmdSocket.on('close', () => {
      this.connection.connected = false;
      this.broadcast({ type: 'connection', data: this.connection });
    });

    this.rtSocket = net.createConnection({ host, port: realtimePort }, () => {
      this.rtSocket.write(this.nullPacket);
    });
    this.rtSocket.on('data', (buf) => {
      this.rtSocket.write(this.nullPacket);
      this.handleSocketData('rt', buf);
    });
    this.rtSocket.on('error', (err) => this.broadcast({ type: 'error', data: err.message }));
  }

  disconnect() {
    if (this.cmdSocket) this.cmdSocket.destroy();
    if (this.rtSocket) this.rtSocket.destroy();
    this.cmdSocket = null;
    this.rtSocket = null;
    this.cmdRx = Buffer.alloc(0);
    this.rtRx = Buffer.alloc(0);
    this.pendingInputNameRequests = [];
    this.connection.connected = false;
    this.stopSseHeartbeat();
  }

  loadStateCache() {
    try {
      if (!fs.existsSync(this.stateCachePath)) return;
      const raw = fs.readFileSync(this.stateCachePath, 'utf8');
      const parsed = JSON.parse(raw || '{}');
      if (parsed && typeof parsed === 'object') {
        if (parsed.state && typeof parsed.state === 'object') this.state = parsed.state;
        if (parsed.stateById && typeof parsed.stateById === 'object') this.stateById = parsed.stateById;
      }
    } catch (_) {
      // ignore malformed cache and continue with empty state
    }
  }

  loadConnectionConfig() {
    try {
      if (!fs.existsSync(this.connectionConfigPath)) return null;
      const raw = fs.readFileSync(this.connectionConfigPath, 'utf8');
      const parsed = JSON.parse(raw || '{}');
      if (!parsed || typeof parsed !== 'object') return null;
      if (!parsed.host) return null;
      return {
        host: String(parsed.host),
        realtimePort: Number(parsed.realtimePort || 5001),
        commandPort: Number(parsed.commandPort || 5002),
        savedAt: parsed.savedAt || null,
      };
    } catch (_) {
      return null;
    }
  }

  saveConnectionConfig({ host, realtimePort, commandPort }) {
    try {
      const payload = {
        host: String(host || ''),
        realtimePort: Number(realtimePort || 5001),
        commandPort: Number(commandPort || 5002),
        savedAt: new Date().toISOString(),
      };
      fs.mkdirSync(path.dirname(this.connectionConfigPath), { recursive: true });
      fs.writeFileSync(this.connectionConfigPath, JSON.stringify(payload, null, 2));
      this.savedConnectionConfig = payload;
    } catch (_) {
      // ignore persist errors
    }
  }

  schedulePersistState() {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      try {
        fs.mkdirSync(path.dirname(this.stateCachePath), { recursive: true });
        fs.writeFileSync(
          this.stateCachePath,
          JSON.stringify(
            {
              savedAt: new Date().toISOString(),
              state: this.state,
              stateById: this.stateById,
            },
            null,
            2,
          ),
        );
      } catch (_) {
        // ignore persist errors
      }
    }, 150);
  }

  handleSocketData(socketKind, chunk) {
    if (!chunk || !chunk.length) return;
    let buf = socketKind === 'cmd' ? Buffer.concat([this.cmdRx, chunk]) : Buffer.concat([this.rtRx, chunk]);

    while (buf.length >= 4) {
      const packetSize = buf.readUInt32LE(0);
      if (packetSize < 8 || packetSize > 1024 * 1024) {
        buf = buf.slice(1);
        continue;
      }
      if (buf.length < packetSize) break;
      const packet = buf.slice(0, packetSize);
      buf = buf.slice(packetSize);
      this.handlePacket(socketKind, packet);
    }

    if (socketKind === 'cmd') this.cmdRx = buf;
    else this.rtRx = buf;
  }

  handlePacket(socketKind, packet) {
    if (!packet || packet.length < 8) return;
    if (packet.equals(this.nullPacket) || packet.equals(this.nullPacketCmd) || packet.equals(this.filterPacket)) {
      if (socketKind === 'cmd' && this.cmdSocket && this.connection.connected) {
        if (packet.equals(this.nullPacketCmd)) this.cmdSocket.write(this.nullPacketCmd);
        else this.cmdSocket.write(this.nullPacket);
      }
      return;
    }
    if (socketKind === 'cmd' && this.tryHandleInputNamePacket(packet)) return;
    this.handleData(packet);
  }

  tryHandleInputNamePacket(packet) {
    if (!Array.isArray(this.pendingInputNameRequests) || this.pendingInputNameRequests.length === 0) return false;
    const marker = Buffer.from([0x03, 0x00, 0x00, 0x00]);
    const pos = packet.indexOf(marker);
    if (pos < 0 || pos + 8 > packet.length) return false;

    const charCount = packet.readInt16LE(pos + 4);
    const byteLen = Math.max(0, charCount * 2);
    if (pos + 8 + byteLen > packet.length) return false;

    const input = this.pendingInputNameRequests.shift();
    const nameBuf = packet.slice(pos + 8, pos + 8 + byteLen);
    const name = nameBuf.toString('utf16le').replace(/\u0000/g, '').trim();

    if (input) {
      const key = `INPUT_NAME_${input}`;
      this.state[key] = name;
      this.schedulePersistState();
      this.broadcast({
        type: 'state',
        data: [{ key, value: name, sectionId: 0, subSectionId: 0, controlId: 0, label: key }],
      });
    }
    return true;
  }

  sendSet(control, value) {
    if (!this.cmdSocket || !this.connection.connected) throw new Error('Not connected');
    const header = encodeControlHeader(control.sectionId, control.controlId, control.subSectionId || 0);
    const payload = Buffer.concat([
      Buffer.from([0x01, 0x00, 0x00, 0x00]),
      header,
      encodeValue(control.type, value),
    ]);
    this.cmdSocket.write(withPacketSize(payload));
  }

  sendGet(control) {
    if (!this.cmdSocket || !this.connection.connected) throw new Error('Not connected');
    const payload = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
      encodeControlHeader(control.sectionId, control.controlId, control.subSectionId || 0),
      Buffer.alloc(4),
    ]);
    this.cmdSocket.write(withPacketSize(payload));
  }

  setInputName(input, name) {
    if (!this.cmdSocket || !this.connection.connected) throw new Error('Not connected');
    const inputBuf = Buffer.alloc(4);
    inputBuf.writeInt32LE(Number(input), 0);
    const nameBuf = Buffer.from(String(name), 'utf16le');
    const chars = Buffer.alloc(4);
    chars.writeInt32LE(nameBuf.length / 2, 0);
    const payload = Buffer.concat([Buffer.from([0x0a, 0x00, 0x00, 0x00]), inputBuf, chars, nameBuf]);
    this.cmdSocket.write(withPacketSize(payload));
    this.state[`INPUT_NAME_${Number(input)}`] = String(name);
    this.schedulePersistState();
  }

  requestInputName(input) {
    if (!this.cmdSocket || !this.connection.connected) throw new Error('Not connected');
    const inputBuf = Buffer.alloc(4);
    inputBuf.writeInt32LE(Number(input), 0);
    this.pendingInputNameRequests.push(Number(input));
    this.cmdSocket.write(withPacketSize(Buffer.concat([Buffer.from([0x09, 0x00, 0x00, 0x00]), inputBuf])));
  }

  requestAllInputNames(maxInput = 12) {
    if (!this.cmdSocket || !this.connection.connected) throw new Error('Not connected');
    let input = 1;
    const step = () => {
      if (!this.cmdSocket || !this.connection.connected) return;
      if (input > maxInput) return;
      this.requestInputName(input);
      input += 1;
      setTimeout(step, 35);
    };
    step();
  }

  requestStateSnapshot() {
    if (!this.cmdSocket || !this.connection.connected) throw new Error('Not connected');
    const queue = [];
    for (const section of this.catalog.sections) {
      const sectionId = section.id;
      const subSectionId = section.subSection || 0;
      for (const control of section.controls || []) {
        queue.push({
          sectionId,
          subSectionId,
          controlId: control.id,
          type: control.type || 'int',
          label: control.label,
        });
      }
    }

    if (this.hasFlexCatalog) {
      const flexOffsets = [0, 1, 2, 5, 6, 9, 10, 11, 12, 14, 15, 16, 22, 23, 24];
      const flexBases = [0, 37, 74, 111];
      for (const subSectionId of [2, 3]) {
        for (const base of flexBases) {
          for (const offset of flexOffsets) {
            const controlId = base + offset;
            queue.push({
              sectionId: 2,
              subSectionId,
              controlId,
              type: inferSection2DveType(controlId),
              label: `2:${subSectionId}:${controlId}`,
            });
          }
        }
      }
    }

    const CHUNK_SIZE = 40;
    const CHUNK_DELAY_MS = 10;
    const sendNext = () => {
      if (!this.cmdSocket || !this.connection.connected) return;
      for (let i = 0; i < CHUNK_SIZE && queue.length > 0; i += 1) {
        this.sendGet(queue.shift());
      }
      if (queue.length > 0) setTimeout(sendNext, CHUNK_DELAY_MS);
    };
    sendNext();
    return queue.length;
  }

  handleData(buffer) {
    if (buffer.length < 12) return;
    const commandId = buffer.readInt32LE(4);
    if (commandId !== 0 && commandId !== 1 && commandId !== 1265200) return;

    const changed = [];
    for (let offset = 8; offset + 8 <= buffer.length; offset += 8) {
      const controlSection = buffer.slice(offset, offset + 4);
      let controlId = controlSection.readUInt16LE(0);
      let sectionId = controlSection.readUInt16LE(2);
      let subSectionId = 0;

      if (sectionId === 2) {
        controlId = controlSection.readUInt8(0);
        subSectionId = controlSection.readUInt8(1);
      }

      const control = this.findControl(sectionId, controlId, subSectionId);
      let type = control ? control.type : 'int';
      if (!control && sectionId === 2 && (subSectionId === 2 || subSectionId === 3)) type = inferSection2DveType(controlId);
      const value = decodeValue(buffer, offset + 4, type);

      const key = control ? control.label : `${sectionId}:${subSectionId}:${controlId}`;
      this.state[key] = value;
      this.stateById[`${sectionId}:${subSectionId}:${controlId}`] = value;
      changed.push({ key, value, sectionId, subSectionId, controlId, label: control ? control.label : null });
    }

    if (changed.length > 0) {
      this.schedulePersistState();
      this.broadcast({ type: 'state', data: changed });
      if (typeof this.hooks.onStateChanged === 'function') {
        try {
          this.hooks.onStateChanged({ changed, state: this.state, stateById: this.stateById });
        } catch (_) {
          // ignore hook errors
        }
      }
    }
  }

  findControl(sectionId, controlId, subSectionId) {
    for (const section of this.catalog.sections) {
      if (section.id !== sectionId) continue;
      const ss = section.subSection || 0;
      if (sectionId === 2 && ss !== subSectionId) continue;
      const control = section.controls.find((c) => c.id === controlId);
      if (control) {
        return {
          sectionId: section.id,
          controlId: control.id,
          subSectionId: ss,
          type: control.type,
          label: control.label,
        };
      }
    }
    return null;
  }

  broadcast(payload) {
    const msg = `data: ${JSON.stringify(payload)}\n\n`;
    for (const res of this.sseClients) {
      try {
        res.write(msg);
      } catch (_) {
        this.sseClients.delete(res);
      }
    }
  }

  startSseHeartbeat() {
    if (this.sseHeartbeatTimer || this.sseClients.size === 0) return;
    this.sseHeartbeatTimer = setInterval(() => {
      if (this.sseClients.size === 0) {
        this.stopSseHeartbeat();
        return;
      }
      for (const res of this.sseClients) {
        try {
          res.write(': ping\n\n');
        } catch (_) {
          this.sseClients.delete(res);
        }
      }
      if (this.sseClients.size === 0) this.stopSseHeartbeat();
    }, this.sseHeartbeatMs);
  }

  stopSseHeartbeat() {
    if (!this.sseHeartbeatTimer) return;
    clearInterval(this.sseHeartbeatTimer);
    this.sseHeartbeatTimer = null;
  }

  addSseClient(res) {
    this.sseClients.add(res);
    let extra = {};
    if (this.hooks && typeof this.hooks.bootstrapData === 'function') {
      try {
        extra = this.hooks.bootstrapData() || {};
      } catch (_) {
        extra = {};
      }
    }
    res.write('retry: 2000\n');
    res.write(`data: ${JSON.stringify({ type: 'bootstrap', data: { connection: this.connection, state: this.state, stateById: this.stateById, ...extra } })}\n\n`);
    this.startSseHeartbeat();
  }

  removeSseClient(res) {
    this.sseClients.delete(res);
    if (this.sseClients.size === 0) this.stopSseHeartbeat();
  }
}

module.exports = {
  DvipClient,
};