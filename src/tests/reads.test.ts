import assert from 'assert/strict'
import { BinaryPacket } from '..'

function testReadEmptyPacket() {
  const PACKET_ID = 1

  const EmptyPacket = BinaryPacket.define(PACKET_ID)

  const expectedLength = 1

  assert(
    EmptyPacket.maximumByteLength === expectedLength,
    `EmptyPacket max len != ${expectedLength}`
  )

  assert(
    EmptyPacket.minimumByteLength === expectedLength,
    `EmptyPacket min len != ${expectedLength}`
  )

  const view = new DataView(new ArrayBuffer(expectedLength))
  view.setUint8(0, PACKET_ID)

  EmptyPacket.read(view)

  try {
    EmptyPacket.read(view, { offset: expectedLength })
    assert(false, 'Could read from outside the offset')
  } catch {}

  // Try changing packet ID : read should fail
  view.setUint8(0, PACKET_ID + 1)
  try {
    EmptyPacket.read(view)
    assert(false, 'Could read EmptyPacket from a non-EmptyPacket dataview')
  } catch {}

  console.log('EmptyPacket: PASS')
}

function testReadSimplePacket() {
  const PACKET_ID = 1

  const SimplePacket = BinaryPacket.define(PACKET_ID, {
    a: BinaryPacket.Field.UNSIGNED_INT_8,
    b: BinaryPacket.Field.UNSIGNED_INT_8,
    c: BinaryPacket.Field.INT_16
  })

  const expectedLength = 1 + 1 + 1 + 2

  assert(
    SimplePacket.maximumByteLength === expectedLength,
    `SimplePacket max len != ${expectedLength}`
  )

  assert(
    SimplePacket.minimumByteLength === expectedLength,
    `SimplePacket min len != ${expectedLength}`
  )

  const view = new DataView(new ArrayBuffer(expectedLength))
  view.setUint8(0, PACKET_ID)

  let data = SimplePacket.read(view)

  console.log('SimplePacket:', data)

  assert(data.a === 0)
  assert(data.b === 0)
  assert(data.c === 0)

  view.setUint8(0, PACKET_ID)
  view.setUint8(1, 123)
  view.setUint8(2, 234)
  view.setUint16(3, 3456)

  data = SimplePacket.read(view)

  console.log('SimplePacket:', data)

  assert(data.a === 123)
  assert(data.b === 234)
  assert(data.c === 3456)

  try {
    SimplePacket.read(view, { offset: expectedLength })
    assert(false, 'Could read from outside the offset')
  } catch {}

  // Try changing packet ID : read should fail
  view.setUint8(0, PACKET_ID + 1)
  try {
    SimplePacket.read(view)
    assert(false, 'Could read SimplePacket from a non-SimplePacket dataview')
  } catch {}

  console.log('SimplePacket: PASS')
}

function testReadComplexPacket() {
  const PACKET_ID = 1
  const SUBPACKET_ID = 2

  const ComplexPacket = BinaryPacket.define(PACKET_ID, {
    a: BinaryPacket.Field.UNSIGNED_INT_8,
    b: BinaryPacket.Field.UNSIGNED_INT_8,
    c: BinaryPacket.Field.INT_16,
    d: BinaryPacket.FieldArray(BinaryPacket.Field.INT_32),
    e: BinaryPacket.define(SUBPACKET_ID, {
      a: BinaryPacket.Field.UNSIGNED_INT_8,
      b: BinaryPacket.FieldArray(BinaryPacket.Field.INT_8)
    })
  })

  const expectedMinLength = 1 + 1 + 1 + 2 + 1 + 1 + 256 * 0 + (1 + 1 + 256 * 0)
  const expectedMaxLength = 1 + 1 + 1 + 2 + 1 + 1 + 256 * 4 + (1 + 1 + 256 * 1)

  assert.equal(ComplexPacket.maximumByteLength, expectedMaxLength)
  assert.equal(ComplexPacket.minimumByteLength, expectedMinLength)

  let view = new DataView(new ArrayBuffer(expectedMinLength))

  view.setUint8(0, PACKET_ID)
  view.setUint8(1, 1)
  view.setUint8(1 + 1, 25)
  view.setUint16(1 + 1 + 1, -20_000)
  view.setUint8(1 + 1 + 1 + 2 + 1, SUBPACKET_ID)
  view.setUint8(1 + 1 + 1 + 2 + 1 + 1, 255)

  let data = ComplexPacket.read(view)
  console.log('ComplexPacket:', data)

  assert(data.a === 1)
  assert(data.b === 25)
  assert(data.c === -20_000)
  assert(Array.isArray(data.d) && data.d.length === 0)
  assert(data.e.a === 255)
  assert(Array.isArray(data.e.b) && data.e.b.length === 0)

  try {
    ComplexPacket.read(view, { offset: expectedMinLength })
    assert(false, 'Could read from outside the offset')
  } catch {}

  // Try changing packet ID : read should fail
  view.setUint8(0, PACKET_ID + 1)
  try {
    ComplexPacket.read(view)
    assert(false, 'Could read ComplexPacket from a non-ComplexPacket dataview')
  } catch {}

  // Try changing sub packet ID : read should fail
  view.setUint8(0, PACKET_ID)
  view.setUint8(6, SUBPACKET_ID + 1)
  try {
    ComplexPacket.read(view)
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

  data = ComplexPacket.read(view)
  console.log('ComplexPacket:', data)

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

  console.log('ComplexPacket: PASS')
}

testReadEmptyPacket()
testReadSimplePacket()
testReadComplexPacket()
