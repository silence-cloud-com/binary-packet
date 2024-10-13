import assert from 'assert/strict'
import {
  BinaryPacket,
  Field,
  FieldArray,
  FieldBitFlags,
  FieldFixedArray,
  FieldOptional,
  FieldString
} from '..'

// NOTE:
// ALL THE WRITE TESTS ARE MADE ON THE ASSUMPTION THAT THE READ TESTS PASSED.
// Make sure that all the read tests pass before trying these ones.

function testWriteEmptyPacket(mode: 'NodeBuffer' | 'DataView' | 'ArrayBuffer') {
  const PACKET_ID = 1

  const Packet = BinaryPacket.define(PACKET_ID)

  const serialized = Packet[`write${mode}`]({})
  let data: ReturnType<(typeof Packet)['read']>

  if (mode === 'ArrayBuffer') {
    data = Packet.readArrayBuffer(serialized.buffer, serialized.byteOffset, serialized.byteLength)
  } else {
    data = Packet[`read${mode}`](serialized as any)
  }

  assert.equal(Object.keys(data).length, 0)

  console.log(`[WRITE ${mode}] EmptyPacket: PASS`)
}

function testWriteSimplePacket(mode: 'NodeBuffer' | 'DataView' | 'ArrayBuffer') {
  const PACKET_ID = 1
  const OPT_SUBPACKET_ID = 2

  const Packet = BinaryPacket.define(PACKET_ID, {
    a: Field.INT_8,
    b: Field.INT_16,
    c: Field.UNSIGNED_INT_32,
    d: Field.FLOAT_32,
    e: FieldFixedArray(Field.INT_8, 2),
    f: Field.FLOAT_64,
    g: FieldString(),
    h: FieldOptional(BinaryPacket.define(OPT_SUBPACKET_ID, { a: Field.UNSIGNED_INT_8 }))
  })

  const random = Math.random()

  const serialized = Packet[`write${mode}`]({
    a: -128,
    b: 32767,
    c: 4294967294,
    d: random,
    e: [40, -40],
    f: random,
    g: 'abcdefghi',
    h: undefined
  })

  let data: ReturnType<(typeof Packet)['read']>

  if (mode === 'ArrayBuffer') {
    data = Packet.readArrayBuffer(serialized.buffer, serialized.byteOffset, serialized.byteLength)
  } else {
    data = Packet[`read${mode}`](serialized as any)
  }

  const epsilon = 1e-7

  assert.equal(data.a, -128)
  assert.equal(data.b, 32767)
  assert.equal(data.c, 4294967294)

  assert.equal(data.e.length, 2)
  assert.equal(data.e[0], 40)
  assert.equal(data.e[1], -40)

  // truncated a Float64 to a Float32 so we must compare with epsilon
  assert(data.d - epsilon < random && data.d + epsilon > random)
  assert.equal(data.f, random)

  assert.equal(data.g, 'abcdefghi')
  assert.equal(data.h, undefined)

  console.log(`[WRITE ${mode}] SimplePacket: PASS`)
}

function testWriteComplexPacket(mode: 'NodeBuffer' | 'DataView' | 'ArrayBuffer') {
  const PACKET_ID = 1
  const SUBPACKET_ID = 2
  const SUBPACKET_ITEM_ID = 3
  const OPT_SUBPACKET_ID = 4

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
        b: FieldArray(Field.INT_8),
        c: FieldFixedArray(Field.INT_8, 3)
      })
    ),
    h: Field.UNSIGNED_INT_32,
    i: FieldBitFlags(['f1', 'f2', 'f3', 'f4', 'f5']),
    j: FieldArray(FieldString()),
    k: FieldOptional(BinaryPacket.define(OPT_SUBPACKET_ID, { a: Field.UNSIGNED_INT_8 }))
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
      { a: 12_000, b: [3, 4], c: [5, 69, -17] },
      { a: -12_000, b: [-3, -4], c: [4, 68, -18] }
    ],
    h: 1,
    i: {
      f1: true,
      f2: true,
      f3: false,
      f4: false,
      f5: true
    },
    j: ['1', '2', 'abcdef'],
    k: {
      a: 254
    }
  })

  let data: ReturnType<(typeof Packet)['read']>

  if (mode === 'ArrayBuffer') {
    data = Packet.readArrayBuffer(serialized.buffer, serialized.byteOffset, serialized.byteLength)
  } else {
    data = Packet[`read${mode}`](serialized as any)
  }

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
  assert.equal(data.g[0].c.length, 3)
  assert.equal(data.g[1].c.length, 3)
  assert.equal(data.g[0].c[0], 5)
  assert.equal(data.g[1].c[0], 4)
  assert.equal(data.g[0].c[1], 69)
  assert.equal(data.g[1].c[1], 68)
  assert.equal(data.g[0].c[2], -17)
  assert.equal(data.g[1].c[2], -18)
  assert.equal(data.h, 1)
  assert.equal(data.i.f1, true)
  assert.equal(data.i.f2, true)
  assert.equal(data.i.f3, false)
  assert.equal(data.i.f4, false)
  assert.equal(data.i.f5, true)
  assert.equal(data.j.length, 3)
  assert.equal(data.j[0], '1')
  assert.equal(data.j[1], '2')
  assert.equal(data.j[2], 'abcdef')
  assert.equal(data.k?.a, 254)

  console.log(`[WRITE ${mode}] ComplexPacket: PASS`)
}

for (const mode of ['NodeBuffer', 'DataView', 'ArrayBuffer'] as const) {
  testWriteEmptyPacket(mode)
  testWriteSimplePacket(mode)
  testWriteComplexPacket(mode)
}
