// NOTE:
// ALL THE BENCHMARK TESTS ARE MADE ON THE ASSUMPTION THAT BOTH THE WRITE AND READ TESTS PASSED.
// Make sure that all the write and read tests pass before trying these ones.
// In this benchmark the speeds are compared with msgpackr which is a popular library for binary serialization/deserialization

import { BinaryPacket, Field, FieldArray } from '..'
import msgpackr from 'msgpackr'
import { gray, red, green, cyan } from 'colors/safe'

function testBenchmarkEmptyPacket() {
  console.log(cyan('EmptyPacket Benchmark:\n'))

  const TIMES = 1_000_000

  const Packet = BinaryPacket.define(69)

  const packr = new msgpackr.Packr()
  const unpackr = new msgpackr.Unpackr()

  let start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    Packet.writeNodeBuffer({})
  }

  let time = performance.now() - start

  console.log(green(`binary-packet: Wrote ${TIMES} EmptyPacket(s) in ${time.toFixed(2)}ms`))
  console.log(green(`binary-packet: Wrote 1 EmptyPacket every ${(time / TIMES).toFixed(5)}ms`))

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    packr.pack({})
  }

  time = performance.now() - start

  console.log(gray('--------------------------------------------------------'))
  console.log(red(`msgpackr: Wrote ${TIMES} EmptyPacket(s) in ${time.toFixed(2)}ms`))
  console.log(red(`msgpackr: Wrote 1 EmptyPacket every ${(time / TIMES).toFixed(5)}ms\n`))

  console.log(gray('Filling buffers for read benchmark...\n'))

  const packets: Buffer[] = Array(TIMES)
  const packeds: Buffer[] = Array(TIMES)

  for (let i = 0; i < TIMES; ++i) {
    packets[i] = Packet.writeNodeBuffer({})
    packeds[i] = packr.pack({})
  }

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    const obj = Packet.readNodeBuffer(packets[i])
  }

  time = performance.now() - start

  console.log(green(`binary-packet: Read ${TIMES} EmptyPacket(s) in ${time.toFixed(2)}ms`))
  console.log(green(`binary-packet: Read 1 EmptyPacket every ${(time / TIMES).toFixed(5)}ms`))

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    const obj = unpackr.unpack(packeds[i])
  }

  time = performance.now() - start

  console.log(gray('--------------------------------------------------------'))
  console.log(red(`msgpackr: Read ${TIMES} EmptyPacket(s) in ${time.toFixed(2)}ms`))
  console.log(red(`msgpackr: Read 1 EmptyPacket every ${(time / TIMES).toFixed(5)}ms`))
}

function testBenchmarkSimplePacket() {
  console.log(cyan('SimplePacket Benchmark:\n'))

  const TIMES = 1_000_000

  const Packet = BinaryPacket.define(69, {
    i: Field.UNSIGNED_INT_32,
    x: Field.UNSIGNED_INT_32,
    y: Field.UNSIGNED_INT_32,
    z: Field.UNSIGNED_INT_8
  })

  const packr = new msgpackr.Packr()
  const unpackr = new msgpackr.Unpackr()

  let start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    Packet.writeNodeBuffer({
      i,
      x: i + 1,
      y: i + 2,
      z: 255
    })
  }

  let time = performance.now() - start

  console.log(green(`binary-packet: Wrote ${TIMES} SimplePacket(s) in ${time.toFixed(2)}ms`))
  console.log(green(`binary-packet: Wrote 1 SimplePacket every ${(time / TIMES).toFixed(5)}ms`))

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    packr.pack({ i, x: i + 1, y: i + 2, z: 255 })
  }

  time = performance.now() - start

  console.log(gray('--------------------------------------------------------'))
  console.log(red(`msgpackr: Wrote ${TIMES} SimplePacket(s) in ${time.toFixed(2)}ms`))
  console.log(red(`msgpackr: Wrote 1 SimplePacket every ${(time / TIMES).toFixed(5)}ms\n`))

  console.log(gray('Filling buffers for read benchmark...\n'))

  const packets: Buffer[] = Array(TIMES)
  const packeds: Buffer[] = Array(TIMES)

  for (let i = 0; i < TIMES; ++i) {
    packets[i] = Packet.writeNodeBuffer({
      i,
      x: i + 1,
      y: i + 2,
      z: 255
    })

    packeds[i] = packr.pack({
      i,
      x: i + 1,
      y: i + 2,
      z: 255
    })
  }

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    const obj = Packet.readNodeBuffer(packets[i])
  }

  time = performance.now() - start

  console.log(green(`binary-packet: Read ${TIMES} SimplePacket(s) in ${time.toFixed(2)}ms`))
  console.log(green(`binary-packet: Read 1 SimplePacket every ${(time / TIMES).toFixed(5)}ms`))

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    const obj = unpackr.unpack(packeds[i])
  }

  time = performance.now() - start

  console.log(gray('--------------------------------------------------------'))
  console.log(red(`msgpackr: Read ${TIMES} SimplePacket(s) in ${time.toFixed(2)}ms`))
  console.log(red(`msgpackr: Read 1 SimplePacket every ${(time / TIMES).toFixed(5)}ms`))
}

function testBenchmarkComplexPacket() {
  console.log(cyan('ComplexPacket Benchmark:\n'))

  const TIMES = 1_000_000

  const SubPacket = BinaryPacket.define(255, {
    subI: Field.UNSIGNED_INT_32,
    subArray: FieldArray(Field.UNSIGNED_INT_32)
  })

  const Packet = BinaryPacket.define(69, {
    i: Field.UNSIGNED_INT_32,
    a: FieldArray(Field.UNSIGNED_INT_32),
    sub: SubPacket
  })

  const packr = new msgpackr.Packr()
  const unpackr = new msgpackr.Unpackr()

  let start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    Packet.writeNodeBuffer({
      i,
      a: [i + 1, i + 2],
      sub: { subArray: [i, i * 2, i * 3], subI: i * 2 }
    })
  }

  let time = performance.now() - start

  console.log(green(`binary-packet: Wrote ${TIMES} ComplexPacket(s) in ${time.toFixed(2)}ms`))
  console.log(green(`binary-packet: Wrote 1 ComplexPacket every ${(time / TIMES).toFixed(5)}ms`))

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    packr.pack({ i, a: [i + 1, i + 2], sub: { subArray: [i, i * 2, i * 3], subI: i * 2 } })
  }

  time = performance.now() - start

  console.log(gray('--------------------------------------------------------'))
  console.log(red(`msgpackr: Wrote ${TIMES} ComplexPacket(s) in ${time.toFixed(2)}ms`))
  console.log(red(`msgpackr: Wrote 1 ComplexPacket every ${(time / TIMES).toFixed(5)}ms\n`))

  console.log(gray('Filling buffers for read benchmark...\n'))

  const packets: Buffer[] = Array(TIMES)
  const packeds: Buffer[] = Array(TIMES)

  for (let i = 0; i < TIMES; ++i) {
    packets[i] = Packet.writeNodeBuffer({
      i,
      a: [i + 1, i + 2],
      sub: { subArray: [i, i * 2, i * 3], subI: i * 2 }
    })

    packeds[i] = packr.pack({
      i,
      a: [i + 1, i + 2],
      sub: { subArray: [i, i * 2, i * 3], subI: i * 2 }
    })
  }

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    const obj = Packet.readNodeBuffer(packets[i])
  }

  time = performance.now() - start

  console.log(green(`binary-packet: Read ${TIMES} ComplexPacket(s) in ${time.toFixed(2)}ms`))
  console.log(green(`binary-packet: Read 1 ComplexPacket every ${(time / TIMES).toFixed(5)}ms`))

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    const obj = unpackr.unpack(packeds[i])
  }

  time = performance.now() - start

  console.log(gray('--------------------------------------------------------'))
  console.log(red(`msgpackr: Read ${TIMES} ComplexPacket(s) in ${time.toFixed(2)}ms`))
  console.log(red(`msgpackr: Read 1 ComplexPacket every ${(time / TIMES).toFixed(5)}ms`))
}

testBenchmarkEmptyPacket()
console.log('\n\n')
testBenchmarkSimplePacket()
console.log('\n\n')
testBenchmarkComplexPacket()
