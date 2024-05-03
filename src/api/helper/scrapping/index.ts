// /* eslint-disable @typescript-eslint/no-empty-function */
import puppeteer from "puppeteer";
import Model from "../../schema/scrapped-items.model";
import _ from "underscore";
import dailyJob from "../../schema/daily-job.model";
import axios, { AxiosResponse } from "axios";
import CategoryModel from "../../schema/category.model";
import itemModel from "../../schema/item.model";

class Scrapping {
  public async scrapCall(item) {
    try {
      const url = `https://hobbyist-scrapper.herokuapp.com/api/v1/scrap-item?item=${item}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.log(error);
    }
  }
  public async ebayScrapping(item) {
    try {
      const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
      const page = await browser.newPage();
      await page.goto("https://www.ebay.com/");
      await page.waitForSelector("#gh-ac");
      await page.type("#gh-ac", `${item}`);
      await page.click('input[value="Search"]');

      await page.waitForSelector("div.s-item__wrapper");

      const link = await page.$$eval("img.s-item__image-img", (items) => {
        return items.map((item: any) => {
          return item.src;
        });
      });

      const title = await page.$$eval("h3.s-item__title", (items) => {
        return items.map((item: any) => {
          return item.innerText;
        });
      });

      const price = await page.$$eval("span.s-item__price", (items) => {
        return items.map((item: any) => {
          return item.innerText;
        });
      });

      const invs = [];

      for (let i = 0, length = 17; i < length; i++) {
        const inv: any = {
          price: this.priceToStr(price[i]),
          title: title[i],
        };
        if (i < link.length) {
          inv.link = link[i];
          inv.baseCurrency = "$";
          inv.date = new Date();
        }
        invs.push(inv);
      }

      return invs;
    } catch (error) {
      if (error instanceof puppeteer.errors.TimeoutError) {
        return error.message;
      }
    }
  }
  public async ebayScrappingDaily(
    itemId?: any,
    user?: any,
    id?: any,
    item?: any
  ) {
    try {

      const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
      const page = await browser.newPage();
      await page.goto("https://www.ebay.com/");
      await page.waitForSelector("#gh-ac");
      await page.type("#gh-ac", `${item}`);
      await page.click('input[value="Search"]');

      await page.waitForSelector("div.s-item__wrapper");

      const link = await page.$$eval("img.s-item__image-img", (items) => {
        return items.map((item: any) => {
          return item.src;
        });
      });

      const title = await page.$$eval("h3.s-item__title", (items) => {
        return items.map((item: any) => {
          return item.innerText;
        });
      });

      const price = await page.$$eval("span.s-item__price", (items) => {
        return items.map((item: any) => {
          return item.innerText;
        });
      });

      const invs = [];

      for (let i = 0, length = 17; i < length; i++) {
        const inv: any = {
          price: this.priceToStr(price[i]),
          title: title[i],
        };
        if (i < link.length) {
          inv.link = link[i];
          inv.baseCurrency = "$";
          inv.date = new Date();
        }
        invs.push(inv);
      }
      // await this.saveItem(itemId, user, id, invs);
      return invs;
    } catch (error) {
      console.log(error);
      throw new Error(error.message);
    }
  }
  public async saveScrapItem(item, keyword, itemId, user) {

    const similar_data = await this.scrappingBee(item, itemId);
    // const keys = keyword.split(",")[0];
    const same_data = await this.scrappingBee(keyword, itemId);

    const createNewScrapItem = await Model.create({
      _itemId: itemId,
      _userId: user,
      similar_data: similar_data,
      same_data: same_data,
    });

    if (createNewScrapItem) return true;
  }
  public async saveDailyJobSimilarItem() {

    // const data = await Model.find({});

    // const similar_data = data.map((item) => item.similar_data).flat()
    const category = await CategoryModel.find({});

    const similar_data = category[0].category


    const items = [];

    for (let i = 0; i < similar_data.length; i += 1) {
      items.push(similar_data.slice(i, i + 1));
    }
    let response;
    let offset = 0;

    _(items).each((item) => {
      setTimeout(() => {
        item.forEach(async (item) => {
          if (item) {
            // console.log(item.title)
            // await this.saveItem(item.item, item.title)
            const data = await this.scrappingBeeDaily(item);

            const average = await this.getAveragePrice(data);

            const median = await this.getMedianPrice(data);

            return await dailyJob.create({
              median: median,
              average: average,
              category: item,
              similar_data: data,
            });
          }
          return response;
        });
      }, 25000 + offset);
      offset += 25000;
    });
  }
  public async saveDailyJobSameItem() {

    // const data = await Model.find({});
    // const same_data = data.map((item) => item.same_data).flat()

    const items_data = await itemModel.find({});
    const same_data = items_data.map((item) => {
      return {
        title: item.item_title.concat(`", "${item.item_keywords}`),
        item: item._id,
      }
    })


    const items = [];

    for (let i = 0; i < same_data.length; i += 1) {
      items.push(same_data.slice(i, i + 1));
    }
    let response;
    let offset = 0;

    _(items).each((item) => {
      setTimeout(() => {
        item.forEach(async (item) => {

          if (item.title !== 'Shop on eBay') {
            // console.log(item.title)
            // await this.saveItem(item.item, item.title)
            const data = await this.scrappingBeeDaily(item.title, item.item);

            const average = await this.getAveragePrice(data);

            const median = await this.getMedianPrice(data);

            return await dailyJob.create({
              _scrapId: item.item,
              median: median,
              average: average,
              same_data: data,
            });
          }
          return response;
        });
      }, 25000 + offset);
      offset += 25000;
    });
  }
  public async priceToStr(price) {
    if (price && price?.includes("to")) {
      const lomerImit = price
        .replaceAll("$", "")
        .replace("to", "")
        .split(" ")[0];
      const upperLimit = price
        .replaceAll("$", "")
        .replace("to", "")
        .split(" ")[1];
      const avgPrice = (parseFloat(lomerImit) + parseFloat(upperLimit)) / 2;
      return !avgPrice ? lomerImit : avgPrice;
    } else {
      return parseFloat(price?.replace("$", ""));
    }
  }
  public async getMedianPrice(items) {
    if (items) {

      return _.sortBy(items.map((item) => parseFloat(item.price)))[Math.floor(items.length / 2)]
    }
  }
  public async getAveragePrice(items) {
    if (items) return items.map((item) => parseFloat(item.price)).reduce((a, b) => a + b, 0) / items.length
  }
  public async saveItem(id, getItems) {

    const data = await this.scrappingBee(getItems, id);

    const average = await this.getAveragePrice(getItems);

    const median = await this.getMedianPrice(getItems);

    return await dailyJob.create({
      _scrapId: id,
      median: median,
      average: average,
      similar_data: data,
    });
  }
  public async scrappingBee(item, id) {
    console.log(item);
    const url = item.replaceAll(" ", "+");

    try {
      const { data } = await axios.get("https://app.scrapingbee.com/api/v1", {
        params: {
          api_key:
            "DCXO8PT2BDINHZNQDJUMHLK9FYAKG3MDW9U4T1A4G7KNZ4IN7WNYA796GELUFA1KW9VQ7R9ZXSXN28IH",
          url: `https://www.ebay.com/sch/i.html?_from=R40&_trksid=p2380057.m570.l1313&_nkw=${url}&_sacat=0`,
          // Wait for there to be at least one
          // non-empty .event-tile element
          wait_for: ".s-item",
          extract_rules: {
            data: {
              // Lets create a list with data
              // extracted from the .event-tile element
              selector: ".s-item",
              type: "list",
              // Each object in the list should
              output: {
                // have a title lifted from
                // the .event-tile__title element
                price: ".s-item__price",
                title: ".s-item__title",
                link: {
                  selector: ".s-item__image-img",
                  output: "@src",
                },
                url: {
                  selector: ".s-item__link",
                  output: "@href"
                }

              },
            },
          },
        },
      });

      const response = data.data;

      const invs = [];

      response.map(async (item) => {
        if (item) {
          const inv: any = {
            price: await this.priceToStr(item.price),
            title: item.title,
          };
          if (item.link) {
            inv.link = item.link;
            inv.baseCurrency = "$";
            inv.date = new Date();
            inv.url = item.url
            inv.item = id
          }
          invs.push(inv);
        }
      });

      return invs;
    } catch (error) {
      throw new Error("ScrapingBee Error: " + error.message);
    }
  }
  public async scrappingBeeDaily(items, id = null) {
    console.log(items);
    const url = items.replaceAll(" ", "+");

    try {
      const { data } = await axios.get("https://app.scrapingbee.com/api/v1", {
        params: {
          api_key:
            "DCXO8PT2BDINHZNQDJUMHLK9FYAKG3MDW9U4T1A4G7KNZ4IN7WNYA796GELUFA1KW9VQ7R9ZXSXN28IH",
          url: `https://www.ebay.com/sch/i.html?_from=R40&_trksid=p2380057.m570.l1313&_nkw=${url}&_sacat=0`,
          // Wait for there to be at least one
          // non-empty .event-tile element
          wait_for: ".s-item",
          extract_rules: {
            data: {
              // Lets create a list with data
              // extracted from the .event-tile element
              selector: ".s-item",
              type: "list",
              // Each object in the list should
              output: {
                // have a title lifted from
                // the .event-tile__title element
                price: ".s-item__price",
                title: ".s-item__title",
                link: {
                  selector: ".s-item__image-img",
                  output: "@src",
                },
                url: {
                  selector: ".s-item__link",
                  output: "@href"
                }
              },
            },
          },
        },
      });

      const response = data.data;

      const invs = [];

      response.map(async (item) => {
        if (item) {
          const inv: any = {
            price: await this.priceToStr(item.price),
            title: item.title,
          };
          if (item.link) {
            inv.link = item.link;
            inv.baseCurrency = "$";
            inv.date = new Date();
            inv.url = item.url
            inv.category = items
            inv.item = id
          }
          invs.push(inv);
        }
      });

      return invs;
    } catch (error) {
      throw new Error("ScrapingBee Error: " + error.message);
    }
  }
}

export { Scrapping };
