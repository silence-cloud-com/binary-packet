// NOTE:
// ALL THE BENCHMARK TESTS ARE MADE ON THE ASSUMPTION THAT BOTH THE WRITE AND READ TESTS PASSED.
// Make sure that all the write and read tests pass before trying these ones.
// In this benchmark the speeds are compared with msgpackr and restructure which are popular libraries for binary serialization/deserialization

import { BinaryPacket, Field, FieldArray } from '..'
import msgpackr from 'msgpackr'
import r from 'restructure'
import { gray, red, green, cyan, yellow } from 'colors/safe'

type Result = {
  library: 'binary-packet' | 'msgpackr' | 'restructure'
  benchmark: 'EmptyPacket' | 'SimplePacket' | 'ComplexPacket'
  speed: string
  speedSingle: string
}

const readResults: Result[] = []
const writeResults: Result[] = []

function testBenchmarkEmptyPacket() {
  console.log(cyan('EmptyPacket Benchmark:\n'))

  const TIMES = 1_000_000

  const Packet = BinaryPacket.define(69)

  const packr = new msgpackr.Packr()
  const unpackr = new msgpackr.Unpackr()

  const PacketFromRestructure = new r.Struct({})

  let start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    Packet.writeNodeBuffer({})
  }

  let time = performance.now() - start

  let speed = time.toFixed(2) + 'ms'
  let speedSingle = (time / TIMES).toFixed(5) + 'ms'

  writeResults.push({
    library: 'binary-packet',
    benchmark: 'EmptyPacket',
    speed,
    speedSingle
  })

  console.log(green(`binary-packet: Wrote ${TIMES} EmptyPacket(s) in ${speed}`))
  console.log(green(`binary-packet: Wrote 1 EmptyPacket every ${speedSingle}`))

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    packr.pack({})
  }

  time = performance.now() - start

  speed = time.toFixed(2) + 'ms'
  speedSingle = (time / TIMES).toFixed(5) + 'ms'

  writeResults.push({
    library: 'msgpackr',
    benchmark: 'EmptyPacket',
    speed,
    speedSingle
  })

  console.log(gray('--------------------------------------------------------'))
  console.log(yellow(`msgpackr: Wrote ${TIMES} EmptyPacket(s) in ${speed}`))
  console.log(yellow(`msgpackr: Wrote 1 EmptyPacket every ${speedSingle}`))

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    PacketFromRestructure.toBuffer({})
  }

  time = performance.now() - start

  speed = time.toFixed(2) + 'ms'
  speedSingle = (time / TIMES).toFixed(5) + 'ms'

  writeResults.push({
    library: 'restructure',
    benchmark: 'EmptyPacket',
    speed,
    speedSingle
  })

  console.log(gray('--------------------------------------------------------'))
  console.log(red(`restructure: Wrote ${TIMES} EmptyPacket(s) in ${speed}`))
  console.log(red(`restructure: Wrote 1 EmptyPacket every ${speedSingle}\n`))

  console.log(gray('Filling buffers for read benchmark...\n'))

  const packets: Buffer[] = Array(TIMES)
  const packeds: Buffer[] = Array(TIMES)
  const structures: Buffer[] = Array(TIMES)

  for (let i = 0; i < TIMES; ++i) {
    packets[i] = Packet.writeNodeBuffer({})
    packeds[i] = packr.pack({})
    structures[i] = PacketFromRestructure.toBuffer({})
  }

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    const obj = Packet.readNodeBuffer(packets[i])
  }

  time = performance.now() - start

  speed = time.toFixed(2) + 'ms'
  speedSingle = (time / TIMES).toFixed(5) + 'ms'

  readResults.push({
    library: 'binary-packet',
    benchmark: 'EmptyPacket',
    speed,
    speedSingle
  })

  console.log(green(`binary-packet: Read ${TIMES} EmptyPacket(s) in ${speed}`))
  console.log(green(`binary-packet: Read 1 EmptyPacket every ${speedSingle}`))

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    const obj = unpackr.unpack(packeds[i])
  }

  time = performance.now() - start

  speed = time.toFixed(2) + 'ms'
  speedSingle = (time / TIMES).toFixed(5) + 'ms'

  readResults.push({
    library: 'msgpackr',
    benchmark: 'EmptyPacket',
    speed,
    speedSingle
  })

  console.log(gray('--------------------------------------------------------'))
  console.log(yellow(`msgpackr: Read ${TIMES} EmptyPacket(s) in ${speed}`))
  console.log(yellow(`msgpackr: Read 1 EmptyPacket every ${speedSingle}`))

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    const obj = PacketFromRestructure.fromBuffer(structures[i])
  }

  time = performance.now() - start

  speed = time.toFixed(2) + 'ms'
  speedSingle = (time / TIMES).toFixed(5) + 'ms'

  readResults.push({
    library: 'restructure',
    benchmark: 'EmptyPacket',
    speed,
    speedSingle
  })

  console.log(gray('--------------------------------------------------------'))
  console.log(red(`restructure: Read ${TIMES} EmptyPacket(s) in ${speed}`))
  console.log(red(`restructure: Read 1 EmptyPacket every ${speedSingle}`))
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

  const PacketFromRestructure = new r.Struct({
    i: r.uint32,
    x: r.uint32,
    y: r.uint32,
    z: r.uint8
  })

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

  let speed = time.toFixed(2) + 'ms'
  let speedSingle = (time / TIMES).toFixed(5) + 'ms'

  writeResults.push({
    library: 'binary-packet',
    benchmark: 'SimplePacket',
    speed,
    speedSingle
  })

  console.log(green(`binary-packet: Wrote ${TIMES} SimplePacket(s) in ${speed}`))
  console.log(green(`binary-packet: Wrote 1 SimplePacket every ${speedSingle}`))

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    packr.pack({ i, x: i + 1, y: i + 2, z: 255 })
  }

  time = performance.now() - start

  speed = time.toFixed(2) + 'ms'
  speedSingle = (time / TIMES).toFixed(5) + 'ms'

  writeResults.push({
    library: 'msgpackr',
    benchmark: 'SimplePacket',
    speed,
    speedSingle
  })

  console.log(gray('--------------------------------------------------------'))
  console.log(yellow(`msgpackr: Wrote ${TIMES} SimplePacket(s) in ${speed}`))
  console.log(yellow(`msgpackr: Wrote 1 SimplePacket every ${speedSingle}`))

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    PacketFromRestructure.toBuffer({ i, x: i + 1, y: i + 2, z: 255 })
  }

  time = performance.now() - start

  speed = time.toFixed(2) + 'ms'
  speedSingle = (time / TIMES).toFixed(5) + 'ms'

  writeResults.push({
    library: 'restructure',
    benchmark: 'SimplePacket',
    speed,
    speedSingle
  })

  console.log(gray('--------------------------------------------------------'))
  console.log(red(`restructure: Wrote ${TIMES} SimplePacket(s) in ${speed}`))
  console.log(red(`restructure: Wrote 1 SimplePacket every ${speedSingle}\n`))

  console.log(gray('Filling buffers for read benchmark...\n'))

  const packets: Buffer[] = Array(TIMES)
  const packeds: Buffer[] = Array(TIMES)
  const structures: Buffer[] = Array(TIMES)

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

    structures[i] = PacketFromRestructure.toBuffer({
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

  speed = time.toFixed(2) + 'ms'
  speedSingle = (time / TIMES).toFixed(5) + 'ms'

  readResults.push({
    library: 'binary-packet',
    benchmark: 'SimplePacket',
    speed,
    speedSingle
  })

  console.log(green(`binary-packet: Read ${TIMES} SimplePacket(s) in ${speed}`))
  console.log(green(`binary-packet: Read 1 SimplePacket every ${speedSingle}`))

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    const obj = unpackr.unpack(packeds[i])
  }

  time = performance.now() - start

  speed = time.toFixed(2) + 'ms'
  speedSingle = (time / TIMES).toFixed(5) + 'ms'

  readResults.push({
    library: 'msgpackr',
    benchmark: 'SimplePacket',
    speed,
    speedSingle
  })

  console.log(gray('--------------------------------------------------------'))
  console.log(yellow(`msgpackr: Read ${TIMES} SimplePacket(s) in ${speed}`))
  console.log(yellow(`msgpackr: Read 1 SimplePacket every ${speedSingle}`))

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    const obj = PacketFromRestructure.fromBuffer(structures[i])
  }

  time = performance.now() - start

  speed = time.toFixed(2) + 'ms'
  speedSingle = (time / TIMES).toFixed(5) + 'ms'

  readResults.push({
    library: 'restructure',
    benchmark: 'SimplePacket',
    speed,
    speedSingle
  })

  console.log(gray('--------------------------------------------------------'))
  console.log(red(`restructure: Read ${TIMES} SimplePacket(s) in ${speed}`))
  console.log(red(`restructure: Read 1 SimplePacket every ${speedSingle}`))
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

  const PacketFromRestructure = new r.Struct({
    i: r.uint32,
    a: new r.Array(r.uint32),
    sub: new r.Struct({
      subI: r.uint32,
      subArray: new r.Array(r.uint32)
    })
  })

  let start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    Packet.writeNodeBuffer({
      i,
      a: [i + 1, i + 2],
      sub: { subArray: [i, i * 2, i * 3], subI: i * 2 }
    })
  }

  let time = performance.now() - start

  let speed = time.toFixed(2) + 'ms'
  let speedSingle = (time / TIMES).toFixed(5) + 'ms'

  writeResults.push({
    library: 'binary-packet',
    benchmark: 'ComplexPacket',
    speed,
    speedSingle
  })

  console.log(green(`binary-packet: Wrote ${TIMES} ComplexPacket(s) in ${speed}`))
  console.log(green(`binary-packet: Wrote 1 ComplexPacket every ${speedSingle}`))

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    packr.pack({ i, a: [i + 1, i + 2], sub: { subArray: [i, i * 2, i * 3], subI: i * 2 } })
  }

  time = performance.now() - start

  speed = time.toFixed(2) + 'ms'
  speedSingle = (time / TIMES).toFixed(5) + 'ms'

  writeResults.push({
    library: 'msgpackr',
    benchmark: 'ComplexPacket',
    speed,
    speedSingle
  })

  console.log(gray('--------------------------------------------------------'))
  console.log(yellow(`msgpackr: Wrote ${TIMES} ComplexPacket(s) in ${speed}`))
  console.log(yellow(`msgpackr: Wrote 1 ComplexPacket every ${speedSingle}`))

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    PacketFromRestructure.toBuffer({
      i,
      a: [i + 1, i + 2],
      sub: { subArray: [i, i * 2, i * 3], subI: i * 2 }
    })
  }

  time = performance.now() - start

  speed = time.toFixed(2) + 'ms'
  speedSingle = (time / TIMES).toFixed(5) + 'ms'

  writeResults.push({
    library: 'restructure',
    benchmark: 'ComplexPacket',
    speed,
    speedSingle
  })

  console.log(gray('--------------------------------------------------------'))
  console.log(red(`restructure: Wrote ${TIMES} ComplexPacket(s) in ${speed}`))
  console.log(red(`restructure: Wrote 1 ComplexPacket every ${speedSingle}\n`))

  console.log(gray('Filling buffers for read benchmark...\n'))

  const packets: Buffer[] = Array(TIMES)
  const packeds: Buffer[] = Array(TIMES)
  const structures: Buffer[] = Array(TIMES)

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

    structures[i] = PacketFromRestructure.toBuffer({
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

  speed = time.toFixed(2) + 'ms'
  speedSingle = (time / TIMES).toFixed(5) + 'ms'

  readResults.push({
    library: 'binary-packet',
    benchmark: 'ComplexPacket',
    speed,
    speedSingle
  })

  console.log(green(`binary-packet: Read ${TIMES} ComplexPacket(s) in ${speed}`))
  console.log(green(`binary-packet: Read 1 ComplexPacket every ${speedSingle}`))

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    const obj = unpackr.unpack(packeds[i])
  }

  time = performance.now() - start

  speed = time.toFixed(2) + 'ms'
  speedSingle = (time / TIMES).toFixed(5) + 'ms'

  readResults.push({
    library: 'msgpackr',
    benchmark: 'ComplexPacket',
    speed,
    speedSingle
  })

  console.log(gray('--------------------------------------------------------'))
  console.log(yellow(`msgpackr: Read ${TIMES} ComplexPacket(s) in ${speed}`))
  console.log(yellow(`msgpackr: Read 1 ComplexPacket every ${speedSingle}`))

  // Restructure reads fail and throw exceptions with the ComplexPacket structure: do not bother.
  console.log(gray('--------------------------------------------------------'))
  console.log(red(`restructure: Read of ComplexPacket(s) crashes`))

  readResults.push({
    library: 'restructure',
    benchmark: 'ComplexPacket',
    speed: 'N/A (Crashes)',
    speedSingle: 'N/A (Crashes)'
  })
}

testBenchmarkEmptyPacket()
console.log('\n\n')
testBenchmarkSimplePacket()
console.log('\n\n')
testBenchmarkComplexPacket()

// console.table(writeResults.sort((a, b) => a.library.localeCompare(b.library)))
// console.table(readResults.sort((a, b) => a.library.localeCompare(b.library)))
