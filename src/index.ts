import {
  decodeStringFromDataView,
  decodeStringFromNodeBuffer,
  encodeStringIntoDataView,
  encodeStringIntoNodeBuffer,
  growDataView,
  growNodeBuffer,
  hasNodeBuffers,
  type TrueArrayBuffer
} from './buffers'

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
 * Defines a dynamically-sized array with elements of a certain type. \
 * Dynamically-sized arrays are useful when a packet's field is an array of a non pre-defined length. \
 * Although, this makes dynamically-sized arrays more memory expensive as the internal buffer needs to be grown accordingly.
 *
 * NOTE: If an array will ALWAYS have the same length, prefer using the `FieldFixedArray` type, for both better performance and memory efficiency. \
 * NOTE: As of now, dynamic arrays can have at most 256 elements.
 */
export function FieldArray<T extends Field | BinaryPacket<Definition> | ''>(
  item: T
): [itemType: T] {
  return [item]
}

/**
 * Defines a statically-sized array with elements of a certain type. \
 * Fixed arrays are useful when a packet's field is an array of a pre-defined length. \
 * Fixed arrays much more memory efficient and performant than non-fixed ones.
 *
 * NOTE: If an array will not always have the same length, use the `FieldArray` type.
 */
export function FieldFixedArray<
  T extends Field | BinaryPacket<Definition> | '',
  Length extends number
>(item: T, length: Length): [itemType: T, length: Length] {
  if (length < 0 || !Number.isFinite(length)) {
    throw new RangeError('Length of a FixedArray must be a positive integer.')
  }

  return [item, length]
}

/**
 * Utility class that allows serializing arrays through any kind of iterable, as long as the number of elements is known beforehand. \
 * Needed to skip the overhead of duplicating the data into an actual array just for it to be serialized straight away and trashed.
 */
export class SequentialSerializer<T> implements Iterable<T> {
  constructor(
    private readonly iterable: Iterable<T>,
    public readonly length: number
  ) {}

  [Symbol.iterator]() {
    return this.iterable[Symbol.iterator]()
  }
}

/**
 * Either an array or a SequentialSerializer<T>.
 *
 * Note: when a packet is **read**, it will **always** be a standard array: the SequentialSerializer \
 * is just a utility to serialize iterators avoiding data duplication and array-creation overheads.
 */
type SequentiallySerializable<T, IsRead extends boolean> = IsRead extends true
  ? T[]
  : T[] | SequentialSerializer<T>

type BitFlags = (string[] | ReadonlyArray<string>) & {
  length: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
}

/**
 * Defines a sequence of up to 8 "flags" (basically single bits/booleans) that can be packed together into a single 8 bits value. \
 * This is useful for minimizing bytes usage when there are lots of boolean fields/flags, instead of saving each flag separately as its own 8 bits value.
 *
 * The input should be an array of strings (with at most 8 elements) where each string defines the name of a flag. \
 * This is just for definition purposes, then when actually writing or reading packets it'll just be a record-object with those names as keys and boolean values.
 */
export function FieldBitFlags<const FlagsArray extends BitFlags>(flags: FlagsArray) {
  if (flags.length > 8) {
    throw new Error(
      `Invalid BinaryPacket definition: a BitFlags field can have only up to 8 flags, given: ${flags.join(', ')}`
    )
  }

  return { flags }
}

/**
 * Defines a string field. \
 * Strings cannot be more than 65536 characters long.
 *
 * NOTE: Only strings containing just ASCII and/or single-octet UTF-8 characters are supported.
 */
export function FieldString() {
  return '' as const
}

/**
 * Defines an optional BinaryPacket "subpacket" field. \
 * When writing and reading packets it'll be possible to provide and receive `undefined` instead of a valid object.
 */
export function FieldOptional<T extends BinaryPacket<Definition>>(packet: T) {
  return { optional: packet }
}

/**
 * Do not manually construct this type: an object of this kind is returned by a BinaryPacket `createVisitor` method. \
 * Used in the `BinaryPacket::visit` static method to perform a sort of "pattern matching" on an incoming packet (of yet unknown type) buffer.
 */
type Visitor = [BinaryPacket<Definition>, (packet: any) => void]

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

  /**
   * Reads just the packetId from the given Buffer. \
   * This method practically just reads the uint8 at offset `byteOffset` (default: 0). \
   * Useful if the receiving side receives multiple types of packets.
   */
  static readPacketIdNodeBuffer(buffer: Buffer, byteOffset = 0) {
    return buffer.readUint8(byteOffset)
  }

  /**
   * Reads just the packetId from the given DataView. \
   * This method practically just reads the uint8 at offset `byteOffset` (default: 0). \
   * Useful if the receiving side receives multiple types of packets.
   */
  static readPacketIdDataView(dataview: DataView, byteOffset = 0) {
    return dataview.getUint8(byteOffset)
  }

  /**
   * Reads just the packetId from the given ArrayBuffer. \
   * This method practically just reads the uint8 at offset `byteOffset`. \
   * Useful if the receiving side receives multiple types of packets.
   *
   * NOTE: Due to security issues, the `byteOffset` argument cannot be defaulted and must be provided by the user. \
   * NOTE: For more information read the `readArrayBuffer` method documentation.
   */
  static readPacketIdArrayBuffer(arraybuffer: TrueArrayBuffer, byteOffset: number) {
    return new Uint8Array(arraybuffer, byteOffset, 1)[0]
  }

  /**
   * Visits and "pattern matches" the given Buffer through the given visitors. \
   * The Buffer is compared to the series of visitors through its Packet ID, and, if an appropriate visitor is found: its callback is called.
   *
   * NOTE: If visiting packets in a loop, for both performance and memory efficiency reasons, it is much better to create each visitor only once before the loop starts and not every iteration.
   */
  static visitNodeBuffer(buffer: Buffer, ...visitors: Visitor[]) {
    return BinaryPacket.visit(buffer, GET_FUNCTION_BUF, decodeStringFromNodeBuffer, visitors)
  }

  /**
   * Visits and "pattern matches" the given DataView through the given visitors. \
   * The DataView is compared to the series of visitors through its Packet ID, and, if an appropriate visitor is found: its callback is called.
   *
   * NOTE: If visiting packets in a loop, for both performance and memory efficiency reasons, it is much better to create each visitor only once before the loop starts and not every iteration.
   */
  static visitDataView(dataview: DataView, ...visitors: Visitor[]) {
    return BinaryPacket.visit(dataview, GET_FUNCTION, decodeStringFromDataView, visitors)
  }

  /**
   * Visits and "pattern matches" the given ArrayBuffer through the given visitors. \
   * The ArrayBuffer is compared to the series of visitors through its Packet ID, and, if an appropriate visitor is found: its callback is called.
   *
   * NOTE: Due to security issues, the `byteOffset` and `byteLength` arguments must be provided by the user. \
   * NOTE: For more information read the `readArrayBuffer` method documentation. \
   * NOTE: If visiting packets in a loop, for both performance and memory efficiency reasons, it is much better to create each visitor only once before the loop starts and not every iteration.
   */
  static visitArrayBuffer(
    arraybuffer: TrueArrayBuffer,
    byteOffset: number,
    byteLength: number,
    ...visitors: Visitor[]
  ) {
    return BinaryPacket.visit(
      new DataView(arraybuffer, byteOffset, byteLength),
      GET_FUNCTION,
      decodeStringFromDataView,
      visitors
    )
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
  ): ToJson<T, true> {
    return this.read(
      dataIn,
      offsetPointer,
      byteLength,
      GET_FUNCTION_BUF,
      decodeStringFromNodeBuffer
    )
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
  ): ToJson<T, true> {
    return this.read(dataIn, offsetPointer, byteLength, GET_FUNCTION, decodeStringFromDataView)
  }

  /**
   * Reads/deserializes from the given ArrayBuffer. \
   * WARNING: this method is practically a HACK.
   *
   * When using this method both the `byteOffset` and `byteLength` are REQUIRED and cannot be defaulted. \
   * This is to prevent serious bugs and security issues. \
   * That is because often raw ArrayBuffers come from a pre-allocated buffer pool and do not start at byteOffset 0.
   *
   * NOTE: if you have a node Buffer do not bother wrapping it into an ArrayBuffer yourself. \
   * NOTE: if you have a node Buffer use the appropriate `readNodeBuffer` as it is much faster and less error prone.
   */
  readArrayBuffer(dataIn: TrueArrayBuffer, byteOffset: number, byteLength: number) {
    return this.read(
      hasNodeBuffers
        ? Buffer.from(dataIn, byteOffset, byteLength)
        : (new DataView(dataIn, byteOffset, byteLength) as any),
      { offset: 0 }, // The underlying buffer has already been offsetted
      byteLength,
      hasNodeBuffers ? GET_FUNCTION_BUF : GET_FUNCTION,
      hasNodeBuffers ? decodeStringFromNodeBuffer : (decodeStringFromDataView as any)
    )
  }

  /**
   * Writes/serializes the given object into a Buffer. \
   * Method available ONLY on NodeJS and Bun.
   *
   * If possible, always prefer writing using this method, as it is much faster than the other ones.
   */
  writeNodeBuffer(dataOut: ToJson<T>) {
    const byteLength = this.precalculateBufferLengthWithStrings(dataOut)
    const buffer = Buffer.allocUnsafe(byteLength)

    return this.write(
      buffer,
      dataOut,
      { offset: 0 },
      byteLength,
      byteLength,
      SET_FUNCTION_BUF,
      growNodeBuffer,
      encodeStringIntoNodeBuffer
    )
  }

  /**
   * Writes/serializes the given object into a DataView. \
   */
  writeDataView(dataOut: ToJson<T>) {
    const byteLength = this.precalculateBufferLengthWithStrings(dataOut)
    const dataview = new DataView(new ArrayBuffer(byteLength))

    return this.write(
      dataview,
      dataOut,
      { offset: 0 },
      byteLength,
      byteLength,
      SET_FUNCTION,
      growDataView,
      encodeStringIntoDataView
    )
  }

  /**
   * Writes/serializes the given object into an ArrayBuffer. \
   * This method is just a wrapper around either  `writeNodeBuffer` or `writeDataView`. \
   *
   * This method works with JavaScript standard raw ArrayBuffer(s) and, as such, is very error prone: \
   * Make sure you're using the returned byteLength and byteOffset fields in the read counterpart. \
   *
   * Always consider whether is possible to use directly `writeNodeBuffer` or `writeDataView` instead of `writeArrayBuffer`. \
   * For more information read the `readArrayBuffer` documentation.
   */
  writeArrayBuffer(dataOut: ToJson<T>) {
    const buf = hasNodeBuffers ? this.writeNodeBuffer(dataOut) : this.writeDataView(dataOut)
    return { buffer: buf.buffer, byteLength: buf.byteLength, byteOffset: buf.byteOffset }
  }

  /**
   * Creates a "visitor" object for this BinaryPacket definition. \
   * Used when visiting and "pattern matching" buffers with the `BinaryPacket::visit` static utility methods. \
   *
   * For more information read the `BinaryPacket::visitNodeBuffer` documentation. \
   * NOTE: If visiting packets in a loop, for both performance and memory efficiency reasons, it is much better to create each visitor only once before the loop starts and not every iteration.
   */
  visitor(onVisit: (packet: ToJson<T>) => void): Visitor {
    return [this, onVisit]
  }

  sequentialSerializer(numElements: number, dataOut: Iterable<ToJson<T>>) {
    const byteLength = this.minimumByteLength * numElements
    const buffer = Buffer.allocUnsafe(byteLength)
    const offsetPointer = { offset: 0 }

    for (const element of dataOut) {
      this.write(
        buffer,
        element,
        offsetPointer,
        byteLength,
        byteLength,
        SET_FUNCTION_BUF,
        growNodeBuffer,
        encodeStringIntoNodeBuffer
      )
    }
  }

  /// PRIVATE

  private readonly entries: Entries
  readonly stringPositions: StringPositions
  readonly minimumByteLength: number

  private constructor(
    private readonly packetId: number,
    definition?: T
  ) {
    this.entries = definition ? sortEntries(definition) : []
    const inspection = inspectEntries(this.entries)
    this.minimumByteLength = inspection.minimumByteLength
    this.stringPositions = inspection.stringPositions
  }

  private static visit<Buf extends DataView | Buffer>(
    dataIn: Buf,
    readFunctions: typeof GET_FUNCTION | typeof GET_FUNCTION_BUF,
    decodeStringFunction: (dataIn: Buf, byteOffset: number, strlen: number) => string,
    visitors: Visitor[]
  ) {
    for (const [Packet, onVisit] of visitors) {
      if (Packet.packetId === readFunctions[Field.UNSIGNED_INT_8](dataIn as any, 0)) {
        return onVisit(
          Packet.read(dataIn, { offset: 0 }, dataIn.byteLength, readFunctions, decodeStringFunction)
        )
      }
    }
  }

  private read<Buf extends DataView | Buffer>(
    dataIn: Buf,
    offsetPointer: { offset: number },
    byteLength: number,
    readFunctions: typeof GET_FUNCTION | typeof GET_FUNCTION_BUF,
    decodeStringFunction: (dataIn: Buf, byteOffset: number, strlen: number) => string
  ): ToJson<T, true> {
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
        const length =
          // def[1] is the length of a statically-sized array, if undefined: must read the length from the buffer as it means it's a dynamically-sized array
          def[1] ?? readFunctions[Field.UNSIGNED_INT_8](dataIn as any, offsetPointer.offset++)

        const array = Array(length)

        const itemType = def[0]

        if (typeof itemType === 'object') {
          // Array of "subpackets"
          for (let i = 0; i < length; ++i) {
            array[i] = itemType.read(
              dataIn,
              offsetPointer,
              byteLength,
              readFunctions,
              decodeStringFunction
            )
          }
        } else if (itemType === '') {
          // Array of strings
          for (let i = 0; i < length; ++i) {
            const strlen = readFunctions[Field.UNSIGNED_INT_16](dataIn as any, offsetPointer.offset)
            offsetPointer.offset += 2

            array[i] = decodeStringFunction(dataIn, offsetPointer.offset, strlen)
            offsetPointer.offset += strlen
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

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        result[name] = array
      } else if (typeof def === 'number') {
        // Single primitive (number)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        result[name] = readFunctions[def](dataIn as any, offsetPointer.offset)
        offsetPointer.offset += BYTE_SIZE[def]
      } else if (def === '') {
        const strlen = readFunctions[Field.UNSIGNED_INT_16](dataIn as any, offsetPointer.offset)
        offsetPointer.offset += 2

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        result[name] = decodeStringFunction(dataIn, offsetPointer.offset, strlen)
        offsetPointer.offset += strlen
      } else if ('flags' in def) {
        // BitFlags
        const flags = readFunctions[Field.UNSIGNED_INT_8](dataIn as any, offsetPointer.offset)
        offsetPointer.offset += 1

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        result[name] = {}

        for (let bit = 0; bit < def.flags.length; ++bit) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          result[name][def.flags[bit]] = !!(flags & (1 << bit))
        }
      } else if ('optional' in def) {
        // Single optional "subpacket"
        const hasSubPacket =
          readFunctions[Field.UNSIGNED_INT_8](dataIn as any, offsetPointer.offset) !== 0

        offsetPointer.offset += 1

        if (hasSubPacket) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          result[name] = def.optional.read(
            dataIn,
            offsetPointer,
            byteLength,
            readFunctions,
            decodeStringFunction
          )
        }
      } else {
        // Single "subpacket"
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        result[name] = def.read(
          dataIn,
          offsetPointer,
          byteLength,
          readFunctions,
          decodeStringFunction
        )
      }
    }

    return result as ToJson<T, true>
  }

  private write<Buf extends DataView | Buffer>(
    buffer: Buf,
    dataOut: ToJson<T>,
    offsetPointer: { offset: number },
    byteLength: number,
    maxByteLength: number,
    writeFunctions: typeof SET_FUNCTION | typeof SET_FUNCTION_BUF,
    growBufferFunction: (buffer: Buf, newByteLength: number) => Buf,
    encodeStringFunction: (buffer: Buf, byteOffset: number, string: string) => void
  ): Buf {
    writeFunctions[Field.UNSIGNED_INT_8](buffer as any, this.packetId, offsetPointer.offset)
    offsetPointer.offset += 1

    for (const [name, def] of this.entries) {
      const data = dataOut[name]

      if (Array.isArray(def)) {
        // Could be both an array of just numbers or "subpackets"

        const length = (data as SequentiallySerializable<any, false>).length

        // Check if it is a dynamically-sized array, if it is, the length of the array must be serialized in the buffer before its elements
        // Explicitly check for undefined and not falsy values because it could be a statically-sized array of 0 elements.
        const isDynamicArray = def[1] === undefined

        if (isDynamicArray) {
          writeFunctions[Field.UNSIGNED_INT_8](buffer as any, length, offsetPointer.offset)
          offsetPointer.offset += 1
        }

        if (length > 0) {
          const itemType = def[0]

          if (typeof itemType === 'object') {
            // Array of "subpackets"

            if (isDynamicArray) {
              const neededBytesForElements = length * itemType.minimumByteLength

              byteLength += neededBytesForElements
              maxByteLength += neededBytesForElements

              if (buffer.byteLength < maxByteLength) {
                buffer = growBufferFunction(buffer, maxByteLength)
              }
            }

            for (const object of data as unknown as ToJson<Definition>[]) {
              // Array of "subpackets"
              buffer = itemType.write(
                buffer,
                object,
                offsetPointer,
                byteLength,
                maxByteLength,
                writeFunctions,
                growBufferFunction,
                encodeStringFunction
              )

              byteLength = offsetPointer.offset
              maxByteLength = buffer.byteLength
            }
          } else if (itemType === '') {
            // Array of strings
            for (let i = 0; i < length; ++i) {
              const str = (data as unknown as string[])[i]
              const strlen = str.length

              writeFunctions[Field.UNSIGNED_INT_16](buffer as any, strlen, offsetPointer.offset)
              offsetPointer.offset += 2

              encodeStringFunction(buffer, offsetPointer.offset, str)
              offsetPointer.offset += strlen
            }
          } else {
            // Array of primitives (numbers)
            const itemSize = BYTE_SIZE[itemType]

            if (isDynamicArray) {
              const neededBytesForElements = length * itemSize

              byteLength += neededBytesForElements
              maxByteLength += neededBytesForElements

              if (buffer.byteLength < maxByteLength) {
                buffer = growBufferFunction(buffer, maxByteLength)
              }
            }

            // It seems like looping over each element is actually much faster than using TypedArrays bulk copy.
            // TODO: properly benchmark with various array sizes to see if it's actually the case.
            for (const number of data as SequentiallySerializable<number, false>) {
              writeFunctions[itemType](buffer as any, number, offsetPointer.offset)
              offsetPointer.offset += itemSize
            }
          }
        }
      } else if (typeof def === 'number') {
        // Single primitive (number)
        writeFunctions[def](buffer as any, data as number, offsetPointer.offset)
        offsetPointer.offset += BYTE_SIZE[def]
      } else if (def === '') {
        // String
        const strlen = (data as string).length

        writeFunctions[Field.UNSIGNED_INT_16](buffer as any, strlen, offsetPointer.offset)
        offsetPointer.offset += 2

        encodeStringFunction(buffer, offsetPointer.offset, data as string)
        offsetPointer.offset += strlen
      } else if ('flags' in def) {
        // BitFlags
        let flags = 0

        for (let bit = 0; bit < def.flags.length; ++bit) {
          if ((data as Record<string, boolean>)[def.flags[bit]]) {
            flags |= 1 << bit
          }
        }

        writeFunctions[Field.UNSIGNED_INT_8](buffer as any, flags, offsetPointer.offset)
        offsetPointer.offset += 1
      } else if ('optional' in def) {
        if (data) {
          writeFunctions[Field.UNSIGNED_INT_8](buffer as any, 1, offsetPointer.offset)
          offsetPointer.offset += 1

          byteLength += def.optional.minimumByteLength
          maxByteLength += def.optional.minimumByteLength

          if (buffer.byteLength < maxByteLength) {
            buffer = growBufferFunction(buffer, maxByteLength)
          }

          buffer = def.optional.write(
            buffer,
            data as ToJson<Definition>,
            offsetPointer,
            byteLength,
            maxByteLength,
            writeFunctions,
            growBufferFunction,
            encodeStringFunction
          )

          byteLength = offsetPointer.offset
          maxByteLength = buffer.byteLength
        } else {
          writeFunctions[Field.UNSIGNED_INT_8](buffer as any, 0, offsetPointer.offset)
          offsetPointer.offset += 1
        }
      } else {
        // Single "subpacket"
        buffer = def.write(
          buffer,
          data as ToJson<Definition>,
          offsetPointer,
          byteLength,
          maxByteLength,
          writeFunctions,
          growBufferFunction,
          encodeStringFunction
        )

        byteLength = offsetPointer.offset
        maxByteLength = buffer.byteLength
      }
    }

    return buffer
  }

  private precalculateBufferLengthWithStrings(dataOut: ToJson<T>) {
    let len = this.minimumByteLength

    for (const field of this.stringPositions[0]) {
      // String field
      len += (dataOut[field] as string).length
    }

    for (const field of this.stringPositions[1]) {
      // Array of strings field
      for (const string of dataOut[field] as unknown as string[]) {
        len += 2 + string.length
      }
    }

    for (const field in this.stringPositions[2]) {
      // Subpacket that has some string fields
      len += this.stringPositions[2][field].precalculateBufferLengthWithStrings(
        dataOut[field] as any
      )
    }

    return len
  }
}

/**
 * BinaryPacket definition: \
 * Any packet can be defined through a "schema" object explaining its fields names and types.
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
 *  cells: FieldArray(CellPacket)
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
  [fieldName: string]:
    | MaybeArray<Field>
    | MaybeArray<BinaryPacket<Definition>>
    | MaybeArray<''>
    | { flags: BitFlags }
    | { optional: BinaryPacket<Definition> }
}

type MaybeArray<T> = T | [itemType: T] | [itemType: T, length: number]

type BitFlagsToJson<FlagsArray extends BitFlags> = {
  [key in FlagsArray[number]]: boolean
}

/**
 * Meta-type that converts a `Definition` schema to the type of the actual JavaScript object that will be written into a packet or read from. \
 */
export type ToJson<T extends Definition, IsRead extends boolean = false> = {
  [K in keyof T]: T[K] extends [infer Item]
    ? Item extends BinaryPacket<infer BPDef>
      ? SequentiallySerializable<ToJson<BPDef, IsRead>, IsRead>
      : Item extends ''
        ? SequentiallySerializable<string, IsRead>
        : SequentiallySerializable<number, IsRead>
    : T[K] extends [infer Item, infer Length]
      ? Item extends BinaryPacket<infer BPDef>
        ? SequentiallySerializable<ToJson<BPDef, IsRead>, IsRead> & { length: Length }
        : Item extends ''
          ? string[] & { length: Length }
          : number[] & { length: Length }
      : T[K] extends BinaryPacket<infer BPDef>
        ? ToJson<BPDef, IsRead>
        : T[K] extends { flags: infer FlagsArray extends BitFlags }
          ? BitFlagsToJson<FlagsArray>
          : T[K] extends { optional: BinaryPacket<infer BPDef extends Definition> }
            ? ToJson<BPDef, IsRead> | undefined
            : T[K] extends ''
              ? string
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

type StringPositions = [
  string[],
  string[],
  {
    [field: string]: BinaryPacket<Definition>
  }
]

/**
 * Helper function that "inspects" the entries of a BinaryPacket definition
 * and returns useful "stats" needed for writing and reading buffers.
 *
 * This function is ever called only once per BinaryPacket definition.
 */
function inspectEntries(entries: Entries) {
  // The PacketID is already 1 byte, that's why we aren't starting from 0.
  let minimumByteLength = 1

  const stringPositions: StringPositions = [[], [], {}]

  for (const [name, type] of entries) {
    if (Array.isArray(type)) {
      if (type.length === 2) {
        // Statically-sized array
        const isString = type[0] === ''

        const itemSize =
          typeof type[0] === 'object'
            ? type[0].minimumByteLength
            : isString
              ? 2
              : BYTE_SIZE[type[0]]

        minimumByteLength += type[1] * itemSize

        if (isString) {
          stringPositions[1].push(name)
        }
      } else {
        // Dynamically-sized array
        // Adding 1 byte to serialize the array length
        minimumByteLength += 1

        if (type[0] === '') {
          stringPositions[1].push(name)
        }
      }
    } else if (type instanceof BinaryPacket) {
      minimumByteLength += type.minimumByteLength
      stringPositions[2][name] = type
    } else if (typeof type === 'object') {
      // BitFlags & Optionals
      // BitFlags are always 1 byte long, because they can hold up to 8 booleans
      // Optionals minimum is 1 byte long, because it holds whether the subpacket is present or not
      minimumByteLength += 1
    } else if (type === '') {
      // String
      // Adding 2 to serialize the string length
      minimumByteLength += 2
      stringPositions[0].push(name)
    } else {
      minimumByteLength += BYTE_SIZE[type]
    }
  }

  return { minimumByteLength, stringPositions }
}

//////////////////////////////////////////////
// The logic here is practically over       //
// Here below there are needed constants    //
// that map a field-type to a functionality //
//////////////////////////////////////////////

const BYTE_SIZE = Array(8) as number[]

BYTE_SIZE[Field.UNSIGNED_INT_8] = 1
BYTE_SIZE[Field.INT_8] = 1

BYTE_SIZE[Field.UNSIGNED_INT_16] = 2
BYTE_SIZE[Field.INT_16] = 2

BYTE_SIZE[Field.UNSIGNED_INT_32] = 4
BYTE_SIZE[Field.INT_32] = 4
BYTE_SIZE[Field.FLOAT_32] = 4

BYTE_SIZE[Field.FLOAT_64] = 8

const GET_FUNCTION = Array(8) as ((view: DataView, offset: number) => number)[]

GET_FUNCTION[Field.UNSIGNED_INT_8] = (view, offset) => view.getUint8(offset)
GET_FUNCTION[Field.INT_8] = (view, offset) => view.getInt8(offset)

GET_FUNCTION[Field.UNSIGNED_INT_16] = (view, offset) => view.getUint16(offset)
GET_FUNCTION[Field.INT_16] = (view, offset) => view.getInt16(offset)

GET_FUNCTION[Field.UNSIGNED_INT_32] = (view, offset) => view.getUint32(offset)
GET_FUNCTION[Field.INT_32] = (view, offset) => view.getInt32(offset)
GET_FUNCTION[Field.FLOAT_32] = (view, offset) => view.getFloat32(offset)

GET_FUNCTION[Field.FLOAT_64] = (view, offset) => view.getFloat64(offset)

const SET_FUNCTION = Array(8) as ((view: DataView, value: number, offset: number) => void)[]

SET_FUNCTION[Field.UNSIGNED_INT_8] = (view, value, offset) => view.setUint8(offset, value)
SET_FUNCTION[Field.INT_8] = (view, value, offset) => view.setInt8(offset, value)

SET_FUNCTION[Field.UNSIGNED_INT_16] = (view, value, offset) => view.setUint16(offset, value)
SET_FUNCTION[Field.INT_16] = (view, value, offset) => view.setInt16(offset, value)

SET_FUNCTION[Field.UNSIGNED_INT_32] = (view, value, offset) => view.setUint32(offset, value)
SET_FUNCTION[Field.INT_32] = (view, value, offset) => view.setInt32(offset, value)
SET_FUNCTION[Field.FLOAT_32] = (view, value, offset) => view.setFloat32(offset, value)

SET_FUNCTION[Field.FLOAT_64] = (view, value, offset) => view.setFloat64(offset, value)

const SET_FUNCTION_BUF = Array(8) as ((nodeBuffer: Buffer, value: number, offset: number) => void)[]

if (hasNodeBuffers) {
  SET_FUNCTION_BUF[Field.UNSIGNED_INT_8] = (view, value, offset) => view.writeUint8(value, offset)
  SET_FUNCTION_BUF[Field.INT_8] = (view, value, offset) => view.writeInt8(value, offset)

  SET_FUNCTION_BUF[Field.UNSIGNED_INT_16] = (view, value, offset) =>
    view.writeUint16BE(value, offset)
  SET_FUNCTION_BUF[Field.INT_16] = (view, value, offset) => view.writeInt16BE(value, offset)

  SET_FUNCTION_BUF[Field.UNSIGNED_INT_32] = (view, value, offset) =>
    view.writeUint32BE(value, offset)
  SET_FUNCTION_BUF[Field.INT_32] = (view, value, offset) => view.writeInt32BE(value, offset)
  SET_FUNCTION_BUF[Field.FLOAT_32] = (view, value, offset) => view.writeFloatBE(value, offset)

  SET_FUNCTION_BUF[Field.FLOAT_64] = (view, value, offset) => view.writeDoubleBE(value, offset)
}

const GET_FUNCTION_BUF = Array(8) as ((nodeBuffer: Buffer, offset: number) => number)[]

if (hasNodeBuffers) {
  GET_FUNCTION_BUF[Field.UNSIGNED_INT_8] = (view, offset) => view.readUint8(offset)
  GET_FUNCTION_BUF[Field.INT_8] = (view, offset) => view.readInt8(offset)

  GET_FUNCTION_BUF[Field.UNSIGNED_INT_16] = (view, offset) => view.readUint16BE(offset)

  GET_FUNCTION_BUF[Field.INT_16] = (view, offset) => view.readInt16BE(offset)
  GET_FUNCTION_BUF[Field.UNSIGNED_INT_32] = (view, offset) => view.readUint32BE(offset)

  GET_FUNCTION_BUF[Field.INT_32] = (view, offset) => view.readInt32BE(offset)
  GET_FUNCTION_BUF[Field.FLOAT_32] = (view, offset) => view.readFloatBE(offset)
  GET_FUNCTION_BUF[Field.FLOAT_64] = (view, offset) => view.readDoubleBE(offset)
}
