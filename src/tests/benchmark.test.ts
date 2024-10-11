// NOTE:
// ALL THE BENCHMARK TESTS ARE MADE ON THE ASSUMPTION THAT BOTH THE WRITE AND READ TESTS PASSED.
// Make sure that all the write and read tests pass before trying these ones.
// In this benchmark the speeds are compared with msgpackr and restructure which are popular libraries for binary serialization/deserialization

import { BinaryPacket, Field, FieldArray, FieldBitFlags, FieldFixedArray, FieldString } from '..'
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

  const packets = Array(TIMES) as Buffer[]
  const packeds = Array(TIMES) as Buffer[]
  const structures = Array(TIMES) as Buffer[]

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
    const obj = unpackr.unpack(packeds[i]) as unknown
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
    z: Field.UNSIGNED_INT_8,
    twoElements: FieldFixedArray(Field.INT_32, 2),
    str: FieldString()
  })

  const packr = new msgpackr.Packr()
  const unpackr = new msgpackr.Unpackr()

  const PacketFromRestructure = new r.Struct({
    i: r.uint32,
    x: r.uint32,
    y: r.uint32,
    z: r.uint8,
    twoElements: new r.Array(r.int32, 2),
    str: new r.String()
  })

  let start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    Packet.writeNodeBuffer({
      i,
      x: i + 1,
      y: i + 2,
      z: 255,
      twoElements: [-i, i],
      str: i.toString()
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
    packr.pack({ i, x: i + 1, y: i + 2, z: 255, twoElements: [-i, i], str: i.toString() })
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
    PacketFromRestructure.toBuffer({
      i,
      x: i + 1,
      y: i + 2,
      z: 255,
      twoElements: [-i, i],
      str: i.toString()
    })
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

  const packets = Array(TIMES) as Buffer[]
  const packeds = Array(TIMES) as Buffer[]
  const structures = Array(TIMES) as Buffer[]

  for (let i = 0; i < TIMES; ++i) {
    packets[i] = Packet.writeNodeBuffer({
      i,
      x: i + 1,
      y: i + 2,
      z: 255,
      twoElements: [-i, i],
      str: i.toString()
    })

    packeds[i] = packr.pack({
      i,
      x: i + 1,
      y: i + 2,
      z: 255,
      twoElements: [-i, i],
      str: i.toString()
    })

    structures[i] = PacketFromRestructure.toBuffer({
      i,
      x: i + 1,
      y: i + 2,
      z: 255,
      twoElements: [-i, i],
      str: i.toString()
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
    const obj = unpackr.unpack(packeds[i]) as unknown
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
    subFlags: FieldBitFlags(['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8']),
    subI: Field.UNSIGNED_INT_32,
    subStr: FieldString(),
    subArray: FieldArray(Field.UNSIGNED_INT_32)
  })

  const Packet = BinaryPacket.define(69, {
    i: Field.UNSIGNED_INT_32,
    a: FieldArray(Field.UNSIGNED_INT_32),
    sub: SubPacket,
    twoElements: FieldFixedArray(Field.INT_32, 2),
    strs: FieldArray(FieldString())
  })

  const packr = new msgpackr.Packr()
  const unpackr = new msgpackr.Unpackr()

  const PacketFromRestructure = new r.Struct({
    i: r.uint32,
    a: new r.Array(r.uint32),
    sub: new r.Struct({
      subFlags: new r.Bitfield(r.uint8, ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8']),
      subI: r.uint32,
      subStr: new r.String(),
      subArray: new r.Array(r.uint32)
    }),
    twoElements: new r.Array(r.int32, 2),
    strs: new r.Array(new r.String())
  })

  let start = performance.now()

  const flags = {
    f1: true,
    f2: true,
    f3: true,
    f4: false,
    f5: false,
    f6: true,
    f7: false,
    f8: false
  }

  for (let i = 0; i < TIMES; ++i) {
    Packet.writeNodeBuffer({
      i,
      a: [i + 1, i + 2],
      sub: {
        subFlags: flags,
        subArray: [i, i * 2, i * 3],
        subStr: (i + 1).toString(),
        subI: i * 2
      },
      twoElements: [-i, i],
      strs: [(-i).toString(), i.toString()]
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
    //! MSGPACKR doesn't "natively" support bitflags, it wouldn't be a fair comparison making it encode a whole object instead of a single byte.
    packr.pack({
      i,
      a: [i + 1, i + 2],
      sub: {
        subFlags: 0b00100111,
        subArray: [i, i * 2, i * 3],
        subStr: (i + 1).toString(),
        subI: i * 2
      },
      twoElements: [-i, i],
      strs: [(-i).toString(), i.toString()]
    })
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
  console.log(yellow(`msgpackr: Wrote ${TIMES} ComplexPacket(s) in ${speed} (no bitflags)`))
  console.log(yellow(`msgpackr: Wrote 1 ComplexPacket every ${speedSingle} (no bitflags)`))

  start = performance.now()

  for (let i = 0; i < TIMES; ++i) {
    PacketFromRestructure.toBuffer({
      i,
      a: [i + 1, i + 2],
      sub: {
        subFlags: flags,
        subArray: [i, i * 2, i * 3],
        subStr: (i + 1).toString(),
        subI: i * 2
      },
      twoElements: [-i, i],
      strs: [(-i).toString(), i.toString()]
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

  const packets = Array(TIMES) as Buffer[]
  const packeds = Array(TIMES) as Buffer[]
  //const structures = Array(TIMES) as Buffer[]

  for (let i = 0; i < TIMES; ++i) {
    packets[i] = Packet.writeNodeBuffer({
      i,
      a: [i + 1, i + 2],
      sub: {
        subFlags: flags,
        subArray: [i, i * 2, i * 3],
        subStr: (i + 1).toString(),
        subI: i * 2
      },
      twoElements: [-i, i],
      strs: [(-i).toString(), i.toString()]
    })

    packeds[i] = packr.pack({
      i,
      a: [i + 1, i + 2],
      sub: {
        subFlags: 0b00100111,
        subArray: [i, i * 2, i * 3],
        subStr: (i + 1).toString(),
        subI: i * 2
      },
      twoElements: [-i, i],
      strs: [(-i).toString(), i.toString()]
    })

    // Useless writing since the read will crash
    /*structures[i] = PacketFromRestructure.toBuffer({
      i,
      a: [i + 1, i + 2],
      sub: { subFlags: flags, subArray: [i, i * 2, i * 3], subI: i * 2 },
      twoElements: [-i, i]
    })*/
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
    const obj = unpackr.unpack(packeds[i]) as unknown
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
  console.log(yellow(`msgpackr: Read ${TIMES} ComplexPacket(s) in ${speed} (no bitflags)`))
  console.log(yellow(`msgpackr: Read 1 ComplexPacket every ${speedSingle} (no bitflags)`))

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
