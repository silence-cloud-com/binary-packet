import assert from 'assert/strict'
import { BinaryPacket, Field, FieldArray, FieldBitFlags, FieldFixedArray } from '..'

function testReadEmptyPacket() {
  const PACKET_ID = 1

  const EmptyPacket = BinaryPacket.define(PACKET_ID)

  const expectedLength = 1

  assert(
    EmptyPacket.minimumByteLength === expectedLength,
    `EmptyPacket min len != ${expectedLength}`
  )

  const view = new DataView(new ArrayBuffer(expectedLength))
  view.setUint8(0, PACKET_ID)

  assert.equal(BinaryPacket.readPacketIdDataView(view), PACKET_ID)

  EmptyPacket.readDataView(view)

  try {
    EmptyPacket.readDataView(view, { offset: expectedLength })
    assert(false, 'Could read from outside the offset')
  } catch {}

  // Try changing packet ID : read should fail
  view.setUint8(0, PACKET_ID + 1)
  try {
    EmptyPacket.readDataView(view)
    assert(false, 'Could read EmptyPacket from a non-EmptyPacket dataview')
  } catch {}

  console.log('[READ] EmptyPacket: PASS')
}

function testReadSimplePacket() {
  const PACKET_ID = 1

  const SimplePacket = BinaryPacket.define(PACKET_ID, {
    a: Field.UNSIGNED_INT_8,
    b: Field.UNSIGNED_INT_8,
    c: Field.INT_16,
    d: FieldFixedArray(Field.INT_16, 3)
  })

  const expectedLength = 1 + 1 + 1 + 2 + 2 * 3

  assert(
    SimplePacket.minimumByteLength === expectedLength,
    `SimplePacket min len != ${expectedLength}`
  )

  const view = new DataView(new ArrayBuffer(expectedLength))

  view.setUint8(0, PACKET_ID)
  assert.equal(BinaryPacket.readPacketIdDataView(view), PACKET_ID)

  let data = SimplePacket.readDataView(view)

  assert(data.a === 0)
  assert(data.b === 0)
  assert(data.c === 0)
  assert.equal(data.d.length, 3)
  assert.equal(data.d[0], 0)
  assert.equal(data.d[1], 0)
  assert.equal(data.d[2], 0)

  view.setUint8(0, PACKET_ID)
  view.setUint8(1, 123)
  view.setUint8(2, 234)
  view.setUint16(3, 3456)
  view.setInt16(5, 1)
  view.setInt16(7, 18_000)
  view.setInt16(9, -32_768)

  data = SimplePacket.readDataView(view)

  assert(data.a === 123)
  assert(data.b === 234)
  assert(data.c === 3456)
  assert.equal(data.d[0], 1)
  assert.equal(data.d[1], 18_000)
  assert.equal(data.d[2], -32_768)

  try {
    SimplePacket.readDataView(view, { offset: expectedLength })
    assert(false, 'Could read from outside the offset')
  } catch {}

  // Try changing packet ID : read should fail
  view.setUint8(0, PACKET_ID + 1)
  try {
    SimplePacket.readDataView(view)
    assert(false, 'Could read SimplePacket from a non-SimplePacket dataview')
  } catch {}

  console.log('[READ] SimplePacket: PASS')
}

function testReadComplexPacket() {
  const PACKET_ID = 1
  const SUBPACKET_ID = 2

  const ComplexPacket = BinaryPacket.define(PACKET_ID, {
    a: Field.UNSIGNED_INT_8,
    b: Field.UNSIGNED_INT_8,
    c: Field.INT_16,
    d: FieldArray(Field.INT_32),
    e: BinaryPacket.define(SUBPACKET_ID, {
      a: Field.UNSIGNED_INT_8,
      b: FieldArray(Field.INT_8)
    }),
    f: Field.FLOAT_64,
    g: FieldFixedArray(Field.INT_8, 4),
    h: FieldBitFlags(['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'])
  })

  const expectedMinLength = 1 + 1 + 1 + 2 + 1 + 1 + 256 * 0 + (1 + 1 + 256 * 0) + 8 + 1 * 4 + 1
  assert.equal(ComplexPacket.minimumByteLength, expectedMinLength)

  let view = new DataView(new ArrayBuffer(expectedMinLength))

  view.setUint8(0, PACKET_ID)
  view.setUint8(1, 1)
  view.setUint8(1 + 1, 25)
  view.setUint16(1 + 1 + 1, -20_000)
  view.setUint8(1 + 1 + 1 + 2 + 1, SUBPACKET_ID)
  view.setUint8(1 + 1 + 1 + 2 + 1 + 1, 255)
  view.setUint8(1 + 1 + 1 + 2 + 1 + 1 + 1, 0)
  view.setFloat64(1 + 1 + 1 + 2 + 1 + 1 + 1 + 1, -1.25)
  view.setInt8(1 + 1 + 1 + 2 + 1 + 1 + 1 + 1 + 8, 100)
  view.setInt8(1 + 1 + 1 + 2 + 1 + 1 + 1 + 1 + 8 + 1, -101)
  view.setInt8(1 + 1 + 1 + 2 + 1 + 1 + 1 + 1 + 8 + 1 + 1, 102)
  view.setInt8(1 + 1 + 1 + 2 + 1 + 1 + 1 + 1 + 8 + 1 + 1 + 1, -103)
  view.setInt8(1 + 1 + 1 + 2 + 1 + 1 + 1 + 1 + 8 + 1 + 1 + 1 + 1, 0b10001101)

  assert.equal(BinaryPacket.readPacketIdDataView(view), PACKET_ID)
  assert.equal(BinaryPacket.readPacketIdDataView(view, 6), SUBPACKET_ID)

  let data = ComplexPacket.readDataView(view)

  assert(data.a === 1)
  assert(data.b === 25)
  assert(data.c === -20_000)
  assert(Array.isArray(data.d) && data.d.length === 0)
  assert(data.e.a === 255)
  assert(Array.isArray(data.e.b) && data.e.b.length === 0)
  assert.equal(data.f, -1.25)
  assert.equal(data.g.length, 4)
  assert.equal(data.g[0], 100)
  assert.equal(data.g[1], -101)
  assert.equal(data.g[2], 102)
  assert.equal(data.g[3], -103)
  assert.equal(data.h.f1, true)
  assert.equal(data.h.f2, false)
  assert.equal(data.h.f3, true)
  assert.equal(data.h.f4, true)
  assert.equal(data.h.f5, false)
  assert.equal(data.h.f6, false)
  assert.equal(data.h.f7, false)
  assert.equal(data.h.f8, true)

  try {
    ComplexPacket.readDataView(view, { offset: expectedMinLength })
    assert(false, 'Could read from outside the offset')
  } catch {}

  // Try changing packet ID : read should fail
  view.setUint8(0, PACKET_ID + 1)
  try {
    ComplexPacket.readDataView(view)
    assert(false, 'Could read ComplexPacket from a non-ComplexPacket dataview')
  } catch {}

  // Try changing sub packet ID : read should fail
  view.setUint8(0, PACKET_ID)
  view.setUint8(6, SUBPACKET_ID + 1)
  try {
    ComplexPacket.readDataView(view)
    assert(false, 'Could read ComplexPacket from a non-ComplexPacket (wrong sub packet) dataview')
  } catch {}

  // Array with five elements and two elements in subpacket.b
  view = new DataView(new ArrayBuffer(expectedMinLength + 5 * 4 + 2))
  view.setUint8(0, PACKET_ID)
  view.setUint8(5, 5)
  view.setInt32(6, 2_400_100)
  view.setInt32(6 + 4, 1)
  view.setInt32(6 + 4 + 4, 2)
  view.setInt32(6 + 4 + 4 + 4, 3)
  view.setInt32(6 + 4 + 4 + 4 + 4, -1_234_567_890)
  view.setUint8(6 + 4 + 4 + 4 + 4 + 4, SUBPACKET_ID)
  view.setUint8(6 + 4 + 4 + 4 + 4 + 4 + 1, 69)
  view.setUint8(6 + 4 + 4 + 4 + 4 + 4 + 1 + 1, 2)
  view.setInt8(6 + 4 + 4 + 4 + 4 + 4 + 1 + 1 + 1, -128)
  view.setInt8(6 + 4 + 4 + 4 + 4 + 4 + 1 + 1 + 1 + 1, 127)

  const random = Math.random()
  view.setFloat64(6 + 4 + 4 + 4 + 4 + 4 + 1 + 1 + 1 + 1 + 1, random)

  assert.equal(BinaryPacket.readPacketIdDataView(view, 6 + 4 + 4 + 4 + 4 + 4), SUBPACKET_ID)

  data = ComplexPacket.readDataView(view)

  assert(data.a === 0)
  assert(data.b === 0)
  assert(data.c === 0)
  assert(Array.isArray(data.d) && data.d.length === 5)
  assert(data.d[0] === 2_400_100)
  assert(data.d[1] === 1)
  assert(data.d[2] === 2)
  assert(data.d[3] === 3)
  assert(data.d[4] === -1_234_567_890)

  assert(data.e.a === 69)
  assert(Array.isArray(data.e.b) && data.e.b.length === 2)
  assert(data.e.b[0] === -128)
  assert(data.e.b[1] === 127)

  assert(data.f === random)

  console.log('[READ] ComplexPacket: PASS')
}

testReadEmptyPacket()
testReadSimplePacket()
testReadComplexPacket()
