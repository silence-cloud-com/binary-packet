import { growDataView, growNodeBuffer, hasNodeBuffers } from './buffers'

export const enum Field {
  /**
   * Defines a 1 byte (8 bits) unsigned integer field. \
   * (Range: 0 - 255)
   */
  UNSIGNED_INT_8 = 0,

  /**
   * Defines a 2 bytes (16 bits) unsigned integer field. \
   * (Range: 0 - 65535)
   */
  UNSIGNED_INT_16,

  /**
   * Defines a 4 bytes (32 bits) unsigned integer field. \
   * (Range: 0 - 4294967295)
   */
  UNSIGNED_INT_32,

  /**
   * Defines a 1 byte (8 bits) signed integer field. \
   * (Range: -128 - 127)
   */
  INT_8,

  /**
   * Defines a 2 bytes (16 bits) signed integer field. \
   * (Range: -32768 - 32767)
   */
  INT_16,

  /**
   * Defines a 4 bytes (32 bits) signed integer field. \
   * (Range: -2147483648 - 2147483647)
   */
  INT_32,

  /**
   * Defines a 4 bytes (32 bits) floating-point field. \
   */
  FLOAT_32,

  /**
   * Defines a 8 bytes (64 bits) floating-point field. \
   */
  FLOAT_64
}

/**
 * Defines an array of a certain type. \
 * As of now, only arrays with at most 256 elements are supported.
 */
export function FieldArray<T extends Field | BinaryPacket<Definition>>(item: T) {
  return [item]
}

export class BinaryPacket<T extends Definition> {
  /**
   * Defines a new binary packet. \
   * Make sure that every `packetId` is unique.
   * @throws RangeError If packetId is negative, floating-point, or greater than 255.
   */
  static define<T extends Definition>(packetId: number, definition?: T) {
    if (packetId < 0 || !Number.isFinite(packetId)) {
      throw new RangeError('Packet IDs must be positive integers.')
    }

    if (packetId > 255) {
      throw new RangeError(
        'Packet IDs greater than 255 are not supported. Do you REALLY need more than 255 different kinds of packets?'
      )
    }

    return new BinaryPacket(packetId, definition)
  }

  private readonly entries: Entries
  readonly canFastWrite: boolean
  readonly minimumByteLength: number

  private constructor(
    private readonly packetId: number,
    definition?: T
  ) {
    this.entries = definition ? sortEntries(definition) : []
    const inspection = inspectEntries(this.entries)

    this.minimumByteLength = inspection.minimumByteLength
    this.canFastWrite = inspection.canFastWrite
  }

  /**
   * Reads/deserializes from the given Buffer. \
   * Method available ONLY on NodeJS and Bun.
   *
   * If possible, always prefer reading using this method, as it is much faster than the other ones.
   *
   * NOTE: if you have an ArrayBuffer do not bother wrapping it into a node Buffer yourself. \
   * NOTE: if you have an ArrayBuffer use the appropriate `readArrayBuffer`.
   */
  readNodeBuffer(
    dataIn: Buffer,
    offsetPointer = { offset: 0 },
    byteLength = dataIn.byteLength
  ): ToJson<T> {
    return this.read(dataIn, offsetPointer, byteLength, GET_FUNCTION_BUF)
  }

  /**
   * Reads/deserializes from the given DataView.
   *
   * NOTE: if you have an ArrayBuffer do not bother wrapping it into a DataView yourself. \
   * NOTE: if you have an ArrayBuffer use the appropriate `readArrayBuffer`.
   */
  readDataView(
    dataIn: DataView,
    offsetPointer = { offset: 0 },
    byteLength = dataIn.byteLength
  ): ToJson<T> {
    return this.read(dataIn, offsetPointer, byteLength, GET_FUNCTION)
  }

  /**
   * Reads/deserializes from the given ArrayBuffer.
   *
   * NOTE: if you have a node Buffer do not bother wrapping it into an ArrayBuffer yourself. \
   * NOTE: if you have a node Buffer use the appropriate `readNodeBuffer` as it is much faster.
   */
  readArrayBuffer(
    dataIn: ArrayBuffer & { buffer?: undefined },
    offsetPointer = { offset: 0 },
    byteLength = dataIn.byteLength
  ) {
    return this.read(
      hasNodeBuffers ? Buffer.from(dataIn, 0, byteLength) : new DataView(dataIn, 0, byteLength),
      offsetPointer,
      byteLength,
      hasNodeBuffers ? GET_FUNCTION_BUF : GET_FUNCTION
    )
  }

  /**
   * Writes/serializes the given object into a Buffer. \
   * Method available ONLY on NodeJS and Bun.
   *
   * If possible, always prefer writing using this method, as it is much faster than the other ones.
   */
  writeNodeBuffer(dataOut: ToJson<T>, offsetPointer = { offset: 0 }) {
    const buffer = Buffer.allocUnsafe(this.minimumByteLength)
    return this.write(buffer, dataOut, offsetPointer, SET_FUNCTION_BUF, growNodeBuffer)
  }

  /**
   * Writes/serializes the given object into a DataView. \
   */
  writeDataView(dataOut: ToJson<T>, offsetPointer = { offset: 0 }) {
    const dataview = new DataView(new ArrayBuffer(this.minimumByteLength))
    return this.write(dataview, dataOut, offsetPointer, SET_FUNCTION, growDataView)
  }

  /**
   * Writes/serializes the given object into an ArrayBuffer. \
   * This method is just a wrapper around either  `writeNodeBuffer` or `writeDataView`.
   */
  writeArrayBuffer(dataOut: ToJson<T>, offsetPointer = { offset: 0 }) {
    return hasNodeBuffers
      ? this.writeNodeBuffer(dataOut, offsetPointer).buffer
      : this.writeDataView(dataOut, offsetPointer).buffer
  }

  private read(
    dataIn: DataView | Buffer,
    offsetPointer: { offset: number },
    byteLength: number,
    readFunctions: typeof GET_FUNCTION | typeof GET_FUNCTION_BUF
  ): ToJson<T> {
    if (byteLength + offsetPointer.offset < this.minimumByteLength) {
      throw new Error(
        `There is no space available to fit a packet of type ${this.packetId} at offset ${offsetPointer.offset}`
      )
    }

    if (
      readFunctions[Field.UNSIGNED_INT_8](dataIn as any, offsetPointer.offset) !== this.packetId
    ) {
      throw new Error(
        `Data at offset ${offsetPointer.offset} is not a packet of type ${this.packetId}`
      )
    }

    offsetPointer.offset += 1
    const result: any = {}

    for (const [name, def] of this.entries) {
      if (Array.isArray(def)) {
        const length = readFunctions[Field.UNSIGNED_INT_8](dataIn as any, offsetPointer.offset++)
        const array = Array(length)

        const itemType = def[0]

        if (typeof itemType === 'object') {
          // Array of "subpackets"
          for (let i = 0; i < length; ++i) {
            array[i] = itemType.read(dataIn, offsetPointer, byteLength, readFunctions)
          }
        } else {
          // Array of primitives (numbers)
          const itemSize = BYTE_SIZE[itemType]

          // It seems like looping over each element is actually much faster than using TypedArrays bulk copy.
          // TODO: properly benchmark with various array sizes to see if it's actually the case.
          for (let i = 0; i < length; ++i) {
            array[i] = readFunctions[itemType](dataIn as any, offsetPointer.offset)
            offsetPointer.offset += itemSize
          }
        }

        result[name] = array
      } else if (typeof def === 'object') {
        // Single "subpacket"
        result[name] = def.read(dataIn, offsetPointer, byteLength, readFunctions)
      } else {
        // Single primitive (number)
        result[name] = readFunctions[def](dataIn as any, offsetPointer.offset)
        offsetPointer.offset += BYTE_SIZE[def]
      }
    }

    return result as ToJson<T>
  }

  private write<Buf extends DataView | Buffer>(
    buffer: Buf,
    dataOut: ToJson<T>,
    offsetPointer: { offset: number },
    writeFunctions: typeof SET_FUNCTION | typeof SET_FUNCTION_BUF,
    growBufferFunction: (buffer: Buf, newByteLength: number) => Buf
  ): Buf {
    writeFunctions[Field.UNSIGNED_INT_8](buffer as any, this.packetId, offsetPointer.offset)
    offsetPointer.offset += 1

    if (this.canFastWrite) {
      // If there are no arrays, the minimumByteLength always equals to the full needed byteLength.
      // So we can take the fast path, since we know beforehand that the buffer isn't going to grow.
      this.fastWrite(buffer, dataOut, offsetPointer, this.minimumByteLength, writeFunctions)
      return buffer
    } else {
      // If non-empty arrays are encountered, the buffer must grow.
      // If every array is empty, the speed of this path is comparable to the fast path.
      return this.slowWrite(
        buffer,
        dataOut,
        offsetPointer,
        this.minimumByteLength,
        this.minimumByteLength,
        writeFunctions,
        growBufferFunction
      )
    }
  }

  private fastWrite<Buf extends DataView | Buffer>(
    buffer: Buf,
    dataOut: ToJson<T>,
    offsetPointer: { offset: number },
    byteLength: number,
    writeFunctions: typeof SET_FUNCTION | typeof SET_FUNCTION_BUF
  ) {
    for (const [name, def] of this.entries) {
      if (typeof def === 'object') {
        // Single "subpacket"
        // In fastWrite there cannot be arrays, but the cast is needed because TypeScript can't possibly know that.
        ;(def as BinaryPacket<Definition>).fastWrite(
          buffer,
          dataOut[name] as ToJson<Definition>,
          offsetPointer,
          byteLength,
          writeFunctions
        )
      } else {
        // Single primitive (number)
        writeFunctions[def](buffer as any, dataOut[name] as number, offsetPointer.offset)
        offsetPointer.offset += BYTE_SIZE[def]
      }
    }
  }

  /**
   * The slow writing path tries writing data into the buffer as fast as the fast writing path does. \
   * But, if a non-empty array is encountered, the buffer needs to grow, slightly reducing performance.
   */
  private slowWrite<Buf extends DataView | Buffer>(
    buffer: Buf,
    dataOut: ToJson<T>,
    offsetPointer: { offset: number },
    byteLength: number,
    maxByteLength: number,
    writeFunctions: typeof SET_FUNCTION | typeof SET_FUNCTION_BUF,
    growBufferFunction: (buffer: Buf, newByteLength: number) => Buf
  ): Buf {
    for (const [name, def] of this.entries) {
      const data = dataOut[name]

      if (Array.isArray(def)) {
        // Could be both an array of just numbers or "subpackets"
        const length = (data as any[]).length

        writeFunctions[Field.UNSIGNED_INT_8](buffer as any, length, offsetPointer.offset)
        offsetPointer.offset += 1

        if (length > 0) {
          const itemType = def[0]

          if (typeof itemType === 'object') {
            // Array of "subpackets"
            const neededBytesForElements = length * itemType.minimumByteLength

            byteLength += neededBytesForElements
            maxByteLength += neededBytesForElements

            if (buffer.byteLength < maxByteLength) {
              buffer = growBufferFunction(buffer, maxByteLength)
            }

            for (const object of data as unknown as ToJson<Definition>[]) {
              writeFunctions[Field.UNSIGNED_INT_8](
                buffer as any,
                itemType.packetId,
                offsetPointer.offset
              )

              offsetPointer.offset += 1

              buffer = itemType.slowWrite(
                buffer,
                object,
                offsetPointer,
                byteLength,
                maxByteLength,
                writeFunctions,
                growBufferFunction
              )

              byteLength = offsetPointer.offset
              maxByteLength = buffer.byteLength
            }
          } else {
            // Array of primitives (numbers)
            const itemSize = BYTE_SIZE[itemType]
            const neededBytesForElements = length * itemSize

            byteLength += neededBytesForElements
            maxByteLength += neededBytesForElements

            if (buffer.byteLength < maxByteLength) {
              buffer = growBufferFunction(buffer, maxByteLength)
            }

            // It seems like looping over each element is actually much faster than using TypedArrays bulk copy.
            // TODO: properly benchmark with various array sizes to see if it's actually the case.
            for (const number of data as number[]) {
              writeFunctions[itemType](buffer as any, number, offsetPointer.offset)
              offsetPointer.offset += itemSize
            }
          }
        }
      } else if (typeof def === 'object') {
        // Single "subpacket"
        writeFunctions[Field.UNSIGNED_INT_8](buffer as any, def.packetId, offsetPointer.offset)
        offsetPointer.offset += 1

        buffer = def.slowWrite(
          buffer,
          data as ToJson<Definition>,
          offsetPointer,
          byteLength,
          maxByteLength,
          writeFunctions,
          growBufferFunction
        )

        byteLength = offsetPointer.offset
        maxByteLength = buffer.byteLength
      } else {
        // Single primitive (number)
        writeFunctions[def](buffer as any, data as number, offsetPointer.offset)
        offsetPointer.offset += BYTE_SIZE[def]
      }
    }

    return buffer
  }
}

/**
 * BinaryPacket definition: \
 * Any packet can be defined through a JSON "schema" explaining its fields names and sizes.
 *
 * @example
 * // Imagine we have a game board where each cell is a square and is one unit big.
 * // A cell can be then defined by its X and Y coordinates.
 * // For simplicity, let's say there cannot be more than 256 cells, so we can use 8 bits for each coordinate.
 * const Cell = {
 *  x: Field.UNSIGNED_INT_8,
 *  y: Field.UNSIGNED_INT_8
 * }
 *
 * // When done with the cell definition we can create its BinaryPacket writer/reader.
 * // NOTE: each BinaryPacket needs an unique ID, for identification purposes and error checking.
 * const CellPacket = BinaryPacket.define(0, Cell)
 *
 * // Let's now make the definition of the whole game board.
 * // You can also specify arrays of both "primitive" fields and other BinaryPackets.
 * const Board = {
 *  numPlayers: Field.UNSIGNED_INT_8,
 *  cells: FieldArray(CellPacket) // equivalent to { cells: [CellPacket] }
 * }
 *
 * // When done with the board definition we can create its BinaryPacket writer/reader.
 * // NOTE: each BinaryPacket needs an unique ID, for identification purposes and error checking.
 * const BoardPacket = BinaryPacket.define(1, Board)
 *
 * // And use it.
 * const buffer = BoardPacket.writeNodeBuffer({
 *  numPlayers: 1,
 *  cells: [
 *    { x: 0, y: 0 },
 *    { x: 1, y: 1 }
 *  ]
 * })
 *
 * // sendTheBufferOver(buffer)
 * // ...
 * // const buffer = receiveTheBuffer()
 * const board = BoardPacket.readNodeBuffer(buffer)
 * // ...
 */
export type Definition = {
  [fieldName: string]: Field | Field[] | BinaryPacket<Definition> | BinaryPacket<Definition>[]
}

/**
 * Meta-type that converts a `Definition` schema to the type of the actual JavaScript object that will be written into a packet or read from. \
 */
type ToJson<T extends Definition> = {
  [K in keyof T]: T[K] extends ReadonlyArray<infer Item>
    ? Item extends BinaryPacket<infer BPDef>
      ? ToJson<BPDef>[]
      : number[]
    : T[K] extends BinaryPacket<infer BPDef>
      ? ToJson<BPDef>
      : number
}

/**
 * In a JavaScript object, the order of its keys is not strictly defined: sort them by field name. \
 * Thus, we cannot trust iterating over an object keys: we MUST iterate over its entries array. \
 * This is important to make sure that whoever shares BinaryPacket definitions can correctly write/read packets independently of their JS engines.
 */
function sortEntries(definition: Definition) {
  return Object.entries(definition).sort(([fieldName1], [fieldName2]) =>
    fieldName1.localeCompare(fieldName2)
  )
}

type Entries = ReturnType<typeof sortEntries>

/**
 * Helper function that "inspects" the entries of a BinaryPacket definition
 * and returns useful "stats" needed for writing and reading buffers.
 *
 * This function is ever called only once per BinaryPacket definition.
 */
function inspectEntries(entries: Entries) {
  // The PacketID is already 1 byte, that's why we aren't starting from 0.
  let minimumByteLength = 1
  let canFastWrite = true

  for (const [, type] of entries) {
    if (Array.isArray(type)) {
      // Adding 1 byte to serialize the array length
      minimumByteLength += 1
      canFastWrite = false
    } else if (type instanceof BinaryPacket) {
      minimumByteLength += type.minimumByteLength
      canFastWrite &&= type.canFastWrite
    } else {
      minimumByteLength += BYTE_SIZE[type]
    }
  }

  return { minimumByteLength, canFastWrite }
}

//////////////////////////////////////////////
// The logic here is practically over       //
// Here below there are needed constants    //
// that map a field-type to a functionality //
//////////////////////////////////////////////

const BYTE_SIZE = Array(8)

BYTE_SIZE[Field.UNSIGNED_INT_8] = 1
BYTE_SIZE[Field.INT_8] = 1

BYTE_SIZE[Field.UNSIGNED_INT_16] = 2
BYTE_SIZE[Field.INT_16] = 2

BYTE_SIZE[Field.UNSIGNED_INT_32] = 4
BYTE_SIZE[Field.INT_32] = 4
BYTE_SIZE[Field.FLOAT_32] = 4

BYTE_SIZE[Field.FLOAT_64] = 8

const GET_FUNCTION: ((view: DataView, offset: number, littleEndian?: boolean) => number)[] =
  Array(8)

GET_FUNCTION[Field.UNSIGNED_INT_8] = (view, offset) => view.getUint8(offset)
GET_FUNCTION[Field.INT_8] = (view, offset) => view.getInt8(offset)

GET_FUNCTION[Field.UNSIGNED_INT_16] = (view, offset, le) => view.getUint16(offset, le)
GET_FUNCTION[Field.INT_16] = (view, offset, le) => view.getInt16(offset, le)

GET_FUNCTION[Field.UNSIGNED_INT_32] = (view, offset, le) => view.getUint32(offset, le)
GET_FUNCTION[Field.INT_32] = (view, offset, le) => view.getInt32(offset, le)
GET_FUNCTION[Field.FLOAT_32] = (view, offset, le) => view.getFloat32(offset, le)

GET_FUNCTION[Field.FLOAT_64] = (view, offset, le) => view.getFloat64(offset, le)

const SET_FUNCTION: ((view: DataView, value: number, offset: number) => void)[] = Array(8)

SET_FUNCTION[Field.UNSIGNED_INT_8] = (view, value, offset) => view.setUint8(offset, value)
SET_FUNCTION[Field.INT_8] = (view, value, offset) => view.setInt8(offset, value)

SET_FUNCTION[Field.UNSIGNED_INT_16] = (view, value, offset) => view.setUint16(offset, value)
SET_FUNCTION[Field.INT_16] = (view, value, offset) => view.setInt16(offset, value)

SET_FUNCTION[Field.UNSIGNED_INT_32] = (view, value, offset) => view.setUint32(offset, value)
SET_FUNCTION[Field.INT_32] = (view, value, offset) => view.setInt32(offset, value)
SET_FUNCTION[Field.FLOAT_32] = (view, value, offset) => view.setFloat32(offset, value)

SET_FUNCTION[Field.FLOAT_64] = (view, value, offset) => view.setFloat64(offset, value)

const SET_FUNCTION_BUF: ((nodeBuffer: Buffer, value: number, offset: number) => void)[] = Array(8)

if (hasNodeBuffers) {
  SET_FUNCTION_BUF[Field.UNSIGNED_INT_8] = (view, value, offset) => view.writeUint8(value, offset)
  SET_FUNCTION_BUF[Field.INT_8] = (view, value, offset) => view.writeInt8(value, offset)

  SET_FUNCTION_BUF[Field.UNSIGNED_INT_16] = (view, value, offset) =>
    view.writeUint16LE(value, offset)
  SET_FUNCTION_BUF[Field.INT_16] = (view, value, offset) => view.writeInt16LE(value, offset)

  SET_FUNCTION_BUF[Field.UNSIGNED_INT_32] = (view, value, offset) =>
    view.writeUint32LE(value, offset)
  SET_FUNCTION_BUF[Field.INT_32] = (view, value, offset) => view.writeInt32LE(value, offset)
  SET_FUNCTION_BUF[Field.FLOAT_32] = (view, value, offset) => view.writeFloatLE(value, offset)

  SET_FUNCTION_BUF[Field.FLOAT_64] = (view, value, offset) => view.writeDoubleLE(value, offset)
}

const GET_FUNCTION_BUF: ((nodeBuffer: Buffer, offset: number) => number)[] = Array(8)

if (hasNodeBuffers) {
  GET_FUNCTION_BUF[Field.UNSIGNED_INT_8] = (view, offset) => view.readUint8(offset)
  GET_FUNCTION_BUF[Field.INT_8] = (view, offset) => view.readInt8(offset)

  GET_FUNCTION_BUF[Field.UNSIGNED_INT_16] = (view, offset) => view.readUint16LE(offset)
  GET_FUNCTION_BUF[Field.INT_16] = (view, offset) => view.readInt16LE(offset)

  GET_FUNCTION_BUF[Field.UNSIGNED_INT_32] = (view, offset) => view.readUint32LE(offset)
  GET_FUNCTION_BUF[Field.INT_32] = (view, offset) => view.readInt32LE(offset)
  GET_FUNCTION_BUF[Field.FLOAT_32] = (view, offset) => view.readFloatLE(offset)

  GET_FUNCTION_BUF[Field.FLOAT_64] = (view, offset) => view.readDoubleLE(offset)
}
