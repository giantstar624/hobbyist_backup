/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import itemModel from "../../schema/item.model";
import { cloudinary } from "../../helper/upload/cloudinary";
import { AddItem, TaskItem } from "../../interfaces";
import CategoryModel from "../../schema/category.model";
import assert from "node:assert/strict";
import _, { filter, find } from "underscore";
import { Scrapping } from "../../helper/scrapping/index";
import ScrapModel from "../../schema/scrapped-items.model";
import DailyItemModel from "../../schema/daily-job.model";
import categoryModel from "../../schema/category.model";

const scrap = new Scrapping();



export class ItemService {
  public async addItem(data: AddItem) {
    const {
      user,
      image_id,
      item_image,
      item_desc,
      item_title,
      item_keywords,
      item_category,
    } = data;

    const findItem = await itemModel.findOne({ item_title });

    if (findItem) {
      return {
        status: 400,
        success: false,
        message: "Item already exists",
        data: null,
      };
    }

    const newItem = await itemModel.create({
      _userId: user,
      item_title,
      item_keywords,
      item_desc,
      item_category,
      image_id: image_id,
      item_image: item_image,
    });

    //create a reverse search

    if (newItem)
      return {
        status: 200,
        success: true,
        message: `${item_title} successfully created`,
        data: newItem,
      };
  }
  public async imageUpload(data) {
    const { file } = data;

    if (!file) {
      return {
        status: 400,
        success: false,
        message: "No file was uploaded",
        data: null,
      };
    }

    if (file?.size > 100000000) {
      return {
        status: 400,
        success: false,
        message: "Image must not exceed 100mb",
      };
    }

    const uploadImage = await cloudinary.v2.uploader.upload(file?.path);

    return {
      status: 200,
      success: true,
      image_id: uploadImage.public_id,
      item_image: uploadImage.secure_url,
    };
  }
  public async editList(data) {
    const {
      user,
      item_id,
      item_desc,
      item_title,
      item_keywords,
      item_category,
      image_id,
      item_image,
    } = data;

    console.log(data, item_id.id);

    const updateItem = await itemModel.findOne({ _id: item_id.id });

    assert(user == updateItem._userId.toString());

    if (image_id) await cloudinary.v2.uploader.destroy(updateItem.image_id);

    updateItem.item_title = item_title || updateItem.item_title;
    updateItem.item_keywords = item_keywords || updateItem.item_keywords;
    updateItem.item_desc = item_desc || updateItem.item_desc;
    updateItem.item_category = item_category || updateItem.item_category;
    updateItem.item_image = item_image || updateItem.item_image;
    updateItem.image_id = image_id || updateItem.image_id;

    updateItem.save();

    return {
      status: 200,
      success: true,
      message: `${item_title} successfully edited`,
      data: updateItem,
    };
  }
  public async itemList(data) {

    const { user, query, } = data;
    // console.log(query.days)
    const day = parseInt(query.days)
    const findItem = await itemModel.find({ _userId: user }).select("-_userId")

    const item_per_day = findItem.map(async (item) => {

      // if ((new Date().getTime() - new Date(item.createdAt).getTime()) / (24 * 60 * 60 * 1000) < day) {

      // eslint-disable-next-line @typescript-eslint/no-empty-function
      await setTimeout(() => { }, 5000);

      const others = await this.getCatalogueValue(item._id)

      return { ...item.toObject(), average: others ? others.average : '', value: others ? others.value : '' };
      // }
    }).filter(item => item)


    const resolved = await Promise.all(item_per_day)


    if (!findItem)
      return {
        status: 400,
        success: true,
        message: "No item found for this account",
        data: resolved,
      };

    if (findItem.length > 0)
      return {
        status: 200,
        success: true,
        message: "Items Found for this account",
        data: resolved
      };
  }
  public async paginateList(data) {

    const { query, list } = data;
    const page = parseInt(query.page);
    const limit = parseInt(query.limit);

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const results: any = {};

    if (endIndex < list.length) {
      results.next = {
        page: page + 1,
        limit: limit,
      };
    }
    if (startIndex > 0) {
      results.previous = {
        page: page - 1,
        limit: limit,
      };
    }

    const List = list.sort(
      (a: any, b: any) =>
        new Date(b.stamps).valueOf() - new Date(a.stamps).valueOf()
    );


    const CheckUrl = (results) =>
      !results
        ? null
        : `https://https://hobbyist-api.herokuapp.com/get-items?page=${results.page}&limit=${results.limit}`;

    const returningData = {
      data: List.slice(startIndex, endIndex).filter(x => x),
      PreviousPage: results.previous,
      NextUrl: CheckUrl(results.next),
      PreviousUrl: CheckUrl(results.previous),
      ListLenght: List.length,
    };

    return returningData;
  }
  public async getOneItem(data) {
    const { item_id } = data;

    const fetchItem = await itemModel.findById(item_id);
    if (!fetchItem)
      return {
        status: 400,
        success: true,
        message: "Item does not exist",
        data: {},
      };
    if (fetchItem)
      return {
        status: 200,
        success: true,
        message: "Item found",
        data: fetchItem,
      };
  }
  public async removeItem(data) {
    const { item_id } = data;

    const fetchItem = await itemModel.findById(item_id);
    if (!fetchItem)
      return {
        status: 400,
        success: true,
        message: "Item does not exist",
        data: {},
      };

    if (fetchItem) {
      const deleteItem = await itemModel.findByIdAndDelete(item_id);
      if (deleteItem)
        return {
          status: 200,
          success: true,
          message: "Item deleted",
          data: fetchItem,
        };
    }
  }
  public async addCategory(data: any) {
    const addCategory: any = await CategoryModel.findOne({});
    console.log(data);

    if (!addCategory) {
      const createList = await CategoryModel.create({
        category: [data],
      });
      return {
        status: 200,
        success: true,
        message: "Data pushed to category",
        data: createList,
      };
    } else if (addCategory) {
      const checkCategory = await CategoryModel.find({ category: data });

      if (checkCategory.length > 0) {
        return {
          status: 401,
          success: false,
          message: "Category already exists",
          data: null,
        };
      }
      if (checkCategory.length == 0) {
        addCategory.category.push(data);
        addCategory.save();

        return {
          status: 200,
          success: true,
          message: "Data pushed to category",
        };
      }
    }
  }
  public async getCategory() {
    const addCategory: any = await CategoryModel.findOne({});
    const data = !addCategory ? [] : addCategory.category;

    return {
      status: 200,
      success: true,
      message: "Category Fetched",
      data,
    };
  }
  public async getSimilarItems(item: any) {
    const getItems = await ScrapModel.findOne({ _itemId: item }).select(
      "-_id -_userId -_itemId"
    );
    const getItem = await itemModel
      .findOne({ _id: item })
      .select("-_id -_userId");

    if (!getItems && getItem) {
      return {
        status: 400,
        success: false,
        message: "No item id found",
        data: null,
      };
    }

    if (getItem && getItems) {
      return {
        status: 200,
        success: true,
        message: "Item found",
        data: {
          item: getItem,
          similar_item: getItems.similar_data.slice(1, 11),
          same_data: getItems.same_data.slice(1, 11),
        },
      };
    }
  }
  public async saveScrapItem(data) {
    const { user, item_id, item_category, item_keyword } = data;

    const startTime = Date.now();
    await scrap.saveScrapItem(item_category, item_keyword, item_id, user);
    const endTime = Date.now();
    console.log(`Time taken to save item: ${endTime - startTime}`);

    const findItem = await itemModel.findOne({ _id: item_id });
    findItem.its_scrapped = true;
    findItem.save();

    return {
      status: 200,
      success: true,
      message: "Item scrapped",
    };
  }
  public getMedianPrice(items) {
    if (items) {

      return _.sortBy(items.map((item) => parseFloat(item.price)))[Math.floor(items.length / 2)]
    }
  }
  public getAveragePrice(items) {
    if (items) return items.map((item) => parseFloat(item.price)).reduce((a, b) => a + b, 0) / items.length
  }
  public async getDailyItems(data) {
    const { itemId, type } = data;

    let response;


    if (type === "items") {


      const findItems = await DailyItemModel.find({ _scrapId: itemId });
      console.log(findItems.length);
      const findItem: any = await ScrapModel.find({ _itemId: itemId })
      const items = findItem[0]?.same_data
      const average = this.getAveragePrice(items)
      const median = this.getMedianPrice(items)
      const first_data = {
        itemId,
        average,
        median,
        createdAt: findItem[0]?.createdAt,
        count: 0
      }

      const data = findItems
        .map((item, count) => {
          return {
            item_id: item._scrapId,
            average: item.average,
            median: item.median,
            createdAt: item.createdAt,
            count,
          };
        })
      // .slice(0, parseInt(count));

      return {
        status: 200,
        success: true,
        message: "Resource found",
        data: [first_data, ...data].sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf())
      }
      // if (findItems.length === 0) {
      //   const findItem: any = await ScrapModel.find({ _itemId: itemId })
      //   if ((findItem.length + 1) >= count) {

      //     const items = findItem[0].same_data
      //     const average = this.getAveragePrice(items)
      //     const median = this.getMedianPrice(items)
      //     const data = {
      //       itemId,
      //       average,
      //       median,
      //       createdAt: findItem[0].createdAt,
      //       count: 0
      //     }

      //     return {
      //       status: 200,
      //       success: true,
      //       message: "resource found for this item",
      //       data,
      //     }
      //   } else {
      //     return {
      //       status: 200,
      //       success: true,
      //       message: "Not enough resource found for the selected date",
      //       data: findItems,
      //     }
      //   }
      // }
      // if (count && findItems.length + 1 >= count) {
      //   const findItem: any = await ScrapModel.find({ _itemId: itemId })
      //   const items = findItem[0].same_data
      //   const average = this.getAveragePrice(items)
      //   const median = this.getMedianPrice(items)
      //   const first_data = {
      //     itemId,
      //     average,
      //     median,
      //     createdAt: findItem[0].createdAt,
      //     count: 0
      //   }

      //   const data = findItems
      //     .map((item, count) => {
      //       return {
      //         item_id: item._scrapId,
      //         average: item.average,
      //         median: item.median,
      //         createdAt: item.createdAt,
      //         count,
      //       };
      //     })
      //     .slice(0, parseInt(count));

      //   return {
      //     status: 200,
      //     success: true,
      //     message: "Resource found",
      //     data: [first_data, ...data],
      //   };
      // } else {
      //   return {
      //     status: 200,
      //     success: true,
      //     message: "Not enough resource found for the selected date",
      //     data: []
      //   };
      // }
    }
    if (type === "categories") {

      const findItems = await itemModel.findOne({ _id: itemId });

      // const category = findItems.item_category

      // const capitalize = category.charAt(0).toUpperCase() + category.slice(1)


      const findCategory = await DailyItemModel.find({
        category: findItems.item_category,
      });
      // await DailyItemModel.updateMany({ category: capitalize }, { category: category })

      if (findCategory.length === 0) {
        return {
          status: 200,
          success: true,
          message: "No resource found for this item",
          data: findCategory,
        };
      }
      if (findCategory.length > 0) {
        const data = findCategory
          .map((item, count) => {
            return {
              category: item.category,
              average: item.average,
              median: item.median,
              createdAt: item.createdAt,
              count,
            };
          }).sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf());
        // .slice(0, parseInt(count));

        return {
          status: 200,
          success: true,
          message: "Resource found",
          data
        };
      } else {
        return {
          status: 200,
          success: true,
          message: "Not enough resource found for the selected date",
          data: []
        };
      }
    }
    // return response
  }
  public async getCatalogueValue(id) {

    try {

      const findScraps = await DailyItemModel.find({ _scrapId: id });

      if (findScraps.length > 0) {

        const todayValue = findScraps.map((item) => {
          if (new Date(item.createdAt).getDate() == new Date().getDate()) {
            return item
          }
        }).filter(item => item)

        if (todayValue.length > 0) {

          const average = todayValue[0]?.average

          const value = todayValue[0]?.same_data.map((item) => {

            if (typeof item.price === 'number') {

              return item.price

            }
          }).filter(x => x)?.reduce((acc, item) => acc + item, 0)


          return {
            average: average ? average : '',
            value: value ? value : ''
          }
        }
      } else {

        const findItem: any = await ScrapModel.find({ _itemId: id })

        if (findItem) {

          const todayValue = findItem.map((item) => {
            if (new Date(item.createdAt).getDate() == new Date().getDate()) {
              return item
            }
          })

          if (todayValue.length > 0) {
            const value = todayValue[0]?.same_data.map((item) => {

              if (typeof item.price === 'number') {
                return item.price

              }
            }).filter(item => item)

            const value_to_return = value ? value?.reduce((acc, item) => acc + item, 0) : []
            const average = value_to_return / value.length


            return {
              average,
              value: value ? value_to_return : ''
            }
          }
        }
      }

    } catch (err) {
      console.error(err);
    }
  }
}
