export namespace BinaryPacket {
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

  /**
   * Defines a new binary packet. \
   * Make sure that every `packetId` is unique.
   * @throws RangeError If packetId is negative, floating-point, or greater than 255.
   */
  export function define<T extends Definition>(packetId: number, definition?: T) {
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

  type Definition = {
    [fieldName: string]:
      | Field
      | ReadonlyArray<Field>
      | BinaryPacket<Definition>
      | ReadonlyArray<BinaryPacket<Definition>>
  }

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
   * This is important to make sure that whoever shares BinaryPacket definitions can correctly write/read packets independently of their JS engines.
   */
  function sortEntries(definition: Definition) {
    return Object.entries(definition).sort(([fieldName1], [fieldName2]) =>
      fieldName1.localeCompare(fieldName2)
    )
  }

  type Entries = ReturnType<typeof sortEntries>

  function isArray(arg: any): arg is any[] | ReadonlyArray<any> {
    return Array.isArray(arg)
  }

  function inspectEntries(entries: Entries) {
    // 1 = Packet ID
    let minimumByteLength = 1

    let hasArrays = false
    const topLevelArrays: string[] = []

    for (const [name, type] of entries) {
      if (isArray(type)) {
        // 1 = Array length
        minimumByteLength += 1
        hasArrays = true
        topLevelArrays.push(name)
      } else if (type instanceof BinaryPacket) {
        minimumByteLength += type.minimumByteLength
        hasArrays ||= type.hasArrays
      } else {
        minimumByteLength += BYTE_SIZE[type]
      }
    }

    return { minimumByteLength, topLevelArrays }
  }

  class BinaryPacket<T extends Definition> {
    private readonly entries: Entries
    private readonly topLevelArrays: string[]
    readonly hasArrays: boolean
    readonly minimumByteLength: number

    constructor(
      private readonly packetId: number,
      definition?: T
    ) {
      this.entries = definition ? sortEntries(definition) : []
      const inspection = inspectEntries(this.entries)

      this.minimumByteLength = inspection.minimumByteLength
      this.topLevelArrays = inspection.topLevelArrays
      this.hasArrays = inspection.topLevelArrays.length > 0
    }

    read(dataIn: DataView, offsetPointer: { offset: number } = { offset: 0 }): ToJson<T> {
      if (dataIn.byteLength < this.minimumByteLength + offsetPointer.offset) {
        throw new Error(
          `There is no space available to fit a packet of type ${this.packetId} at offset ${offsetPointer.offset}`
        )
      }

      if (dataIn.getUint8(offsetPointer.offset) !== this.packetId) {
        throw new Error(
          `Data at offset ${offsetPointer.offset} is not a packet of type ${this.packetId}`
        )
      }

      offsetPointer.offset += 1
      const result: any = {}

      for (const [name, def] of this.entries) {
        if (isArray(def)) {
          const length = dataIn.getUint8(offsetPointer.offset++)
          const array: any[] = Array(length)
          const itemType = def[0]

          if (typeof itemType === 'object') {
            for (let i = 0; i < length; ++i) {
              array[i] = itemType.read(dataIn, offsetPointer)
            }
          } else {
            for (let i = 0; i < length; ++i) {
              array[i] = GET_FUNCTION[itemType](dataIn, offsetPointer.offset)
              offsetPointer.offset += BYTE_SIZE[itemType]
            }
          }

          result[name] = array
        } else if (typeof def === 'object') {
          result[name] = def.read(dataIn, offsetPointer)
        } else {
          result[name] = GET_FUNCTION[def](dataIn, offsetPointer.offset)
          offsetPointer.offset += BYTE_SIZE[def]
        }
      }

      return result as ToJson<T>
    }

    // TODO
    write(dataOut: ToJson<T>, offsetPointer = { offset: 0 }): DataView {
      if (!this.hasArrays) {
        const view = new DataView(new ArrayBuffer(this.minimumByteLength))
        this.fastWrite(view, dataOut, offsetPointer)
        return view
      }

      // TODO
      throw new Error('TODO')
    }

    private fastWrite(view: DataView, dataOut: ToJson<T>, offsetPointer: { offset: number }) {
      for (const [name, def] of this.entries) {
        if (typeof def === 'object') {
          // In fastWrite there cannot be arrays
          const bpDef = def as BinaryPacket<Definition>
          bpDef.fastWrite(view, dataOut[name] as ToJson<Definition>, offsetPointer)
        } else {
          SET_FUNCTION[def](view, dataOut[name] as number, offsetPointer.offset)
          offsetPointer.offset += BYTE_SIZE[def]
        }
      }
    }
  }

  const BYTE_SIZE: number[] = Array(8)

  BYTE_SIZE[Field.UNSIGNED_INT_8] = 1
  BYTE_SIZE[Field.INT_8] = 1

  BYTE_SIZE[Field.UNSIGNED_INT_16] = 2
  BYTE_SIZE[Field.INT_16] = 2

  BYTE_SIZE[Field.UNSIGNED_INT_32] = 4
  BYTE_SIZE[Field.INT_32] = 4
  BYTE_SIZE[Field.FLOAT_32] = 4

  BYTE_SIZE[Field.FLOAT_64] = 8

  const GET_FUNCTION: ((view: DataView, offset: number) => number)[] = Array(8)

  GET_FUNCTION[Field.UNSIGNED_INT_8] = (view, offset) => view.getUint8(offset)
  GET_FUNCTION[Field.INT_8] = (view, offset) => view.getInt8(offset)

  GET_FUNCTION[Field.UNSIGNED_INT_16] = (view, offset) => view.getUint16(offset)
  GET_FUNCTION[Field.INT_16] = (view, offset) => view.getInt16(offset)

  GET_FUNCTION[Field.UNSIGNED_INT_32] = (view, offset) => view.getUint32(offset)
  GET_FUNCTION[Field.INT_32] = (view, offset) => view.getInt32(offset)
  GET_FUNCTION[Field.FLOAT_32] = (view, offset) => view.getFloat32(offset)

  GET_FUNCTION[Field.FLOAT_64] = (view, offset) => view.getFloat64(offset)

  const SET_FUNCTION: ((view: DataView, value: number, offset: number) => void)[] = Array(8)

  SET_FUNCTION[Field.UNSIGNED_INT_8] = (view, value, offset) => view.setUint8(offset, value)
  SET_FUNCTION[Field.INT_8] = (view, value, offset) => view.setInt8(offset, value)

  SET_FUNCTION[Field.UNSIGNED_INT_16] = (view, value, offset) => view.setUint16(offset, value)
  SET_FUNCTION[Field.INT_16] = (view, value, offset) => view.setInt16(offset, value)

  SET_FUNCTION[Field.UNSIGNED_INT_32] = (view, value, offset) => view.setUint32(offset, value)
  SET_FUNCTION[Field.INT_32] = (view, value, offset) => view.setInt32(offset, value)
  SET_FUNCTION[Field.FLOAT_32] = (view, value, offset) => view.setFloat32(offset, value)

  SET_FUNCTION[Field.FLOAT_64] = (view, value, offset) => view.setFloat64(offset, value)
}
