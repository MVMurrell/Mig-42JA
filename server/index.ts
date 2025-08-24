// PATH: server/index.ts
import app from "../api/app.ts";

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`server http://localhost:${port}`));
