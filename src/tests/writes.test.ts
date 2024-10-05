import assert from 'assert/strict'
import { BinaryPacket, Field, FieldArray } from '..'

// NOTE:
// ALL THE WRITE TESTS ARE MADE ON THE ASSUMPTION THAT THE READ TESTS PASSED.
// Make sure that all the read tests pass before trying these ones.

function testWriteEmptyPacket(mode: 'NodeBuffer' | 'DataView' | 'ArrayBuffer') {
  const PACKET_ID = 1

  const Packet = BinaryPacket.define(PACKET_ID)

  const serialized = Packet[`write${mode}`]({})

  if (mode === 'ArrayBuffer') {
    console.log(serialized)
  }

  const data = Packet[`read${mode}`](serialized as any)

  assert.equal(Object.keys(data).length, 0)

  console.log(`[WRITE ${mode}] EmptyPacket: PASS`)
}

function testWriteSimplePacket(mode: 'NodeBuffer' | 'DataView' | 'ArrayBuffer') {
  const PACKET_ID = 1

  const Packet = BinaryPacket.define(PACKET_ID, {
    a: Field.INT_8,
    b: Field.INT_16,
    c: Field.UNSIGNED_INT_32
  })

  const serialized = Packet[`write${mode}`]({
    a: -128,
    b: 32767,
    c: 4294967294
  })

  const data = Packet[`read${mode}`](serialized as any)

  assert.equal(data.a, -128)
  assert.equal(data.b, 32767)
  assert.equal(data.c, 4294967294)

  console.log(`[WRITE ${mode}] SimplePacket: PASS`)
}

function testWriteComplexPacket(mode: 'NodeBuffer' | 'DataView' | 'ArrayBuffer') {
  const PACKET_ID = 1
  const SUBPACKET_ID = 2
  const SUBPACKET_ITEM_ID = 3

  const Packet = BinaryPacket.define(PACKET_ID, {
    a: Field.INT_8,
    b: Field.INT_16,
    c: Field.UNSIGNED_INT_32,
    d: BinaryPacket.define(SUBPACKET_ID, {
      a: Field.INT_8,
      b: Field.UNSIGNED_INT_16
    }),
    e: FieldArray(Field.INT_32),
    f: Field.UNSIGNED_INT_8,
    g: FieldArray(
      BinaryPacket.define(SUBPACKET_ITEM_ID, {
        a: Field.INT_16,
        b: FieldArray(Field.INT_8)
      })
    ),
    h: Field.UNSIGNED_INT_32
  })

  const serialized = Packet[`write${mode}`]({
    a: -128,
    b: 32767,
    c: 4294967295,
    d: {
      a: 127,
      b: 65534
    },
    e: [1, 2, 3, 1_200_400, -2_124_123_456],

    f: 65,
    g: [
      { a: 12_000, b: [3, 4] },
      { a: -12_000, b: [-3, -4] }
    ],
    h: 1
  })

  const data = Packet[`read${mode}`](serialized as any)

  assert.equal(data.a, -128)
  assert.equal(data.b, 32767)
  assert.equal(data.c, 4294967295)
  assert(Array.isArray(data.e))
  assert.equal(data.e.length, 5)
  assert.equal(data.e[0], 1)
  assert.equal(data.e[1], 2)
  assert.equal(data.e[2], 3)
  assert.equal(data.e[3], 1_200_400)
  assert.equal(data.e[4], -2_124_123_456)
  assert.equal(data.f, 65)
  assert(Array.isArray(data.g))
  assert.equal(data.g.length, 2)
  assert.equal(data.g[0].a, 12_000)
  assert.equal(data.g[1].a, -12_000)
  assert(Array.isArray(data.g[0].b))
  assert(Array.isArray(data.g[1].b))
  assert.equal(data.g[0].b.length, 2)
  assert.equal(data.g[1].b.length, 2)
  assert.equal(data.g[0].b[0], 3)
  assert.equal(data.g[1].b[0], -3)
  assert.equal(data.g[0].b[1], 4)
  assert.equal(data.g[1].b[1], -4)
  assert.equal(data.h, 1)

  console.log(`[WRITE ${mode}] ComplexPacket: PASS`)
}

for (const mode of ['NodeBuffer', 'DataView', 'ArrayBuffer'] as const) {
  testWriteEmptyPacket(mode)
  testWriteSimplePacket(mode)
  testWriteComplexPacket(mode)
}
