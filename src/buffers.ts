/**
 * Exclusively matches objects of type `ArrayBuffer` and no other types that inherit from it. \
 * This is needed because the `DataView` constructor explicitly requires a "true" ArrayBuffer, or else it throws.
 */
export type TrueArrayBuffer = ArrayBuffer & { buffer?: undefined }

export const hasNodeBuffers = typeof Buffer === 'function'

export function growDataView(dataview: DataView, newByteLength: number) {
  const resizedBuffer = new ArrayBuffer(newByteLength)
  const amountToCopy = Math.min(dataview.byteLength, resizedBuffer.byteLength)

  // Treat the buffer as if it was a Float64Array so we can copy 8 bytes at a time, to finish faster
  let length = Math.trunc(amountToCopy / 8)
  new Float64Array(resizedBuffer, 0, length).set(new Float64Array(dataview.buffer, 0, length))

  // Copy the remaining up to 7 bytes
  const offset = length * 8
  length = amountToCopy - offset
  new Uint8Array(resizedBuffer, offset, length).set(new Uint8Array(dataview.buffer, offset, length))

  return new DataView(resizedBuffer)
}

export function growNodeBuffer(buffer: Buffer, newByteLength: number) {
  const newBuffer = Buffer.allocUnsafe(newByteLength)
  buffer.copy(newBuffer)
  return newBuffer
}

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

export function encodeStringIntoDataView(dataview: DataView, byteOffset: number, string: string) {
  const strlen = string.length
  const u8Buffer = new Uint8Array(dataview.buffer, dataview.byteOffset + byteOffset, strlen)

  if (strlen <= 64) {
    encodeSmallString(u8Buffer, 0, string, strlen)
  } else {
    textEncoder.encodeInto(string, u8Buffer)
  }
}

export function encodeStringIntoNodeBuffer(buffer: Buffer, byteOffset: number, string: string) {
  const strlen = string.length

  if (strlen <= 64) {
    encodeSmallString(buffer, byteOffset, string, strlen)
  } else {
    buffer.utf8Write(string, byteOffset, strlen)
  }
}

function encodeSmallString(buffer: Uint8Array, byteOffset: number, string: string, strlen: number) {
  for (let i = 0; i < strlen; ++i) {
    buffer[byteOffset + i] = string.charCodeAt(i) & 0xff
  }
}

export function decodeStringFromNodeBuffer(buffer: Buffer, byteOffset: number, strlen: number) {
  return buffer.subarray(byteOffset, byteOffset + strlen).toString('utf8')
}

export function decodeStringFromDataView(dataview: DataView, byteOffset: number, strlen: number) {
  return textDecoder.decode(new DataView(dataview.buffer, dataview.byteOffset + byteOffset, strlen))
}

declare global {
  interface Buffer {
    /**
     * Node buffer's internals function. \
     * For some reason it is not exposed through TypeScript. \
     * Fastest way to write utf8 strings into buffers.
     */
    utf8Write(string: string, byteOffset?: number, byteLength?: number): number
  }
}
