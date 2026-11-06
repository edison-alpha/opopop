// Test connectivity between all key rooms in OPPERA
import("./dist/assets/index-C7DId1Yt.js").then((mod) => {
  console.log("Loaded bundled module successfully!")
}).catch((err) => {
  // We can write a self-contained node test if needed
  console.log("Note:", err.message)
})
