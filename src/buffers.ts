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
