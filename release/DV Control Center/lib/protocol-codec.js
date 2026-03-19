function encodeControlHeader(sectionId, controlId, subSectionId = 0) {
  const header = Buffer.alloc(4);
  if (sectionId === 2) {
    header.writeUInt8(controlId & 0xff, 0);
    header.writeUInt8(subSectionId & 0xff, 1);
    header.writeUInt16LE(2, 2);
  } else {
    header.writeUInt16LE(controlId, 0);
    header.writeUInt16LE(sectionId, 2);
  }
  return header;
}

function encodeValue(controlType, value) {
  const out = Buffer.alloc(4);
  switch (controlType) {
    case 'float':
      out.writeFloatLE(Number(value), 0);
      break;
    case 'flag':
      out.writeUInt8(Number(value) ? 1 : 0, 0);
      break;
    case 'int':
    default:
      out.writeInt32LE(Number(value), 0);
      break;
  }
  return out;
}

function decodeValue(buffer, offset, controlType) {
  switch (controlType) {
    case 'float':
      return buffer.readFloatLE(offset);
    case 'flag':
      return buffer.readUInt8(offset);
    case 'int':
    default:
      return buffer.readInt32LE(offset);
  }
}

function inferSection2DveType(controlId) {
  const base = [0, 37, 74, 111];
  let local = controlId;
  for (const b of base) {
    if (controlId >= b && controlId < b + 37) {
      local = controlId - b;
      break;
    }
  }
  if (local === 0) return 'flag';
  if (local === 4 || local === 14 || local === 31) return 'int';
  return 'float';
}

function withPacketSize(payload) {
  const packet = Buffer.alloc(payload.length + 4);
  packet.writeUInt32LE(payload.length + 4, 0);
  payload.copy(packet, 4);
  return packet;
}

module.exports = {
  encodeControlHeader,
  encodeValue,
  decodeValue,
  inferSection2DveType,
  withPacketSize,
};