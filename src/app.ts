/* eslint-disable @typescript-eslint/no-var-requires */
import express from 'express';
import cors from 'cors'
import { logger } from './api/config/logger';
import connectDatabase from './api/database';
import routes from './api/routes'
import cron from 'node-cron'
import { Scrapping } from './api/helper/scrapping/index'
import morgan from 'morgan'
const scrap = new Scrapping()
const app = express();

connectDatabase()
const port = process.env.PORT || 8080;

require('dotenv').config()

app.use(cors())

app.use(
  express.json({
    limit: "50mb",
    type: [
      "application/json",
      "text/plain", // AWS sends this content-type for its messages/notifications
    ],
  })
);
app.use(express.urlencoded({ extended: true }));
app.use(morgan(':date *** :method :: :url ** :response-time'));


app.use(routes);


setInterval(async () => {

  await scrap.saveDailyJobSimilarItem()
  console.log('running similar job')

}, 86400000)

setInterval(async () => {

  await scrap.saveDailyJobSameItem()
  console.log('running same job')

}, 90000000)

app.get('/test-simi', async (req, res) => {
  // const x = await scrap.saveDailyJobSameItem()
  const x = await scrap.saveDailyJobSimilarItem()
  res.json('running')
})
app.get('/test-same', async (req, res) => {
  const x = await scrap.saveDailyJobSameItem()
  // const x = await scrap.saveDailyJobSimilarItem()
  res.json('running')
})


app.listen(port, () => {
  logger.info(`server listening on http://localhost:${port}`)
});