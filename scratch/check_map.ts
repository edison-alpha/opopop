import { floor, objects, isBlocked, SPAWN, MAP_W, MAP_H, BLOCKING } from "./apps/web/src/office/game/map.ts"

console.log("Spawn:", SPAWN, "Blocked at spawn?", isBlocked(SPAWN.x, SPAWN.y))

// Check doors
const OX = 13, OY = 9
const doors = [
  ["Focus 1", OX + 6, OY + 9],
  ["Focus 1b", OX + 7, OY + 9],
  ["Focus 2", OX + 18, OY + 9],
  ["Focus 2b", OX + 19, OY + 9],
  ["Focus 3", OX + 42, OY + 9],
  ["Focus 3b", OX + 43, OY + 9],
  ["Focus 4", OX + 54, OY + 9],
  ["Focus 4b", OX + 55, OY + 9],
  ["Cafe", OX + 11, OY + 14],
  ["Cafe b", OX + 11, OY + 15],
  ["Library", OX + 11, OY + 22],
  ["Library b", OX + 11, OY + 23],
  ["Meeting A", OX + 48, OY + 14],
  ["Meeting A b", OX + 48, OY + 15],
  ["Meeting B", OX + 48, OY + 22],
  ["Meeting B b", OX + 48, OY + 23],
  ["Exec Boardroom", OX + 45, OY + 27],
  ["Exec Boardroom b", OX + 46, OY + 27],
  ["Lobby-Exec", OX + 34, OY + 31],
  ["Lobby-Exec b", OX + 34, OY + 32],
]

for (const [name, x, y] of doors) {
  console.log(`${name} (${x}, ${y}): floor=${floor[y][x]}, obj=${objects[y][x]}, blocked=${isBlocked(x, y)}`)
}
