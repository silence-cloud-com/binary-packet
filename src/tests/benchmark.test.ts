// NOTE:
// ALL THE BENCHMARK TESTS ARE MADE ON THE ASSUMPTION THAT BOTH THE WRITE AND READ TESTS PASSED.
// Make sure that all the write and read tests pass before trying these ones.
// In this benchmark the speeds are compared with msgpackr which is a popular library for binary serialization/deserialization

import { BinaryPacket, Field, FieldArray } from '..'
import msgpackr from 'msgpackr'
import assert from 'assert/strict'

function testBenchmarkSimplePacket() {
  const TIMES = 1_000_000
  const Packet = BinaryPacket.define(69, {
    i: Field.UNSIGNED_INT_32,
    a: FieldArray(Field.UNSIGNED_INT_32)
  })

  const packr = new msgpackr.Packr()
  const unpackr = new msgpackr.Unpackr()

  let start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    Packet.writeNodeBuffer({ i, a: [i + 1, i + 2] })
  }

  let time = performance.now() - start

  console.log(`BINARY-PACKET : Wrote ${TIMES} SimplePacket(s) in ${time}ms`)
  console.log(`BINARY-PACKET : Wrote 1 SimplePacket every ${time / TIMES}ms\n`)

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    packr.pack({ i, a: [i + 1, i + 2] })
  }

  time = performance.now() - start

  console.log(`MSGPACKR : Wrote ${TIMES} SimplePacket(s) in ${time}ms`)
  console.log(`MSGPACKR : Wrote 1 SimplePacket every ${time / TIMES}ms\n`)

  console.log('Filling buffers for read benchmark...\n')

  const packets: Buffer[] = Array(TIMES)
  const packeds: Buffer[] = Array(TIMES)

  for (let i = 0; i < TIMES; ++i) {
    packets[i] = Packet.writeNodeBuffer({ i, a: [i + 1, i + 2] })
    assert.equal(packets[i].byteLength, 14)

    packeds[i] = packr.pack({ i, a: [i + 1, i + 2] })
  }

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    const obj = Packet.readNodeBuffer(packets[i])
    assert.equal(obj.i, i)
    assert.equal(obj.a[0], obj.i + 1)
    assert.equal(obj.a[1], obj.i + 2)
  }

  time = performance.now() - start

  console.log(`BINARY-PACKET : Read ${TIMES} SimplePacket(s) in ${time}ms`)
  console.log(`BINARY-PACKET : Read 1 SimplePacket every ${time / TIMES}ms\n`)

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    const obj = unpackr.unpack(packeds[i])
    assert.equal(obj.i, i)
    assert.equal(obj.a[0], obj.i + 1)
    assert.equal(obj.a[1], obj.i + 2)
  }

  time = performance.now() - start

  console.log(`MSGPACKR : Read ${TIMES} SimplePacket(s) in ${time}ms`)
  console.log(`MSGPACKR : Read 1 SimplePacket every ${time / TIMES}ms`)
}

testBenchmarkSimplePacket()
