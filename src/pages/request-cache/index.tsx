import React, { useState, useEffect } from "react";
import { List, Button, message, Space, Card, Col, Row } from "antd";

interface Request {
  api: string;
  method: "GET" | "POST";
  params: Record<string, any>;
}
interface ListItem {
  id: number;
  name: string;
}

const log = (text: string) => {
  console.log(text);
  message.info(text);
};

// TODO: 需要使用ref存数据，要不然重新渲染缓存就无效了
export default function RequestCache() {
  const [listData, setListData] = useState<ListItem[]>([]);

  // 使用 Map 数据结构存储缓存数据
  const cache = new Map();

  // 存放等待状态的回调函数
  const callbackMap = new Map();

  // 存放缓存状态
  const statusMap = new Map();

  // 根据接口地址和参数生成一个唯一的 Key 用于存取缓存数据
  const genKey = (api: string, params: Record<string, any>): string => {
    return `${api}_${JSON.stringify(params)}`;
  };

  const makeRequest = ({ api, method, params, ...rest }: Request) => {
    const cacheKey = genKey(api, params);
    let apiUrl = api;
    console.log("cache", cache);
    // 判断是否需要缓存
    if (cache.has(cacheKey)) {
      log("正在读取缓存数据...");
      // 因为请求函数返回的数据类型是 Promise，所以此处不能直接返回数据本身
      return Promise.resolve(cache.get(cacheKey));
    }

    // 如果是 GET 请求并且有参数，将参数附加到 URL 上
    if (method === "GET" && params) {
      const queryString = Object.keys(params)
        .map((key) => `${key}=${encodeURIComponent(params[key])}`)
        .join("&");
      apiUrl += `?${queryString}`;

      // const url = new URL(api);
      // url.searchParams.append('key', 'value');
      // url.toString();
    }

    const requestOptions = {
      method: method,
      ...rest,
    };

    if (method === "POST") {
      requestOptions.headers = {
        ...requestOptions.headers,
        "Content-Type": "application/json",
      };
      requestOptions.body = JSON.stringify(params);
    }

    if (statusMap.has(cacheKey)) {
      const curStatus = statusMap.get(cacheKey);

      // 判断当前的接口缓存状态，如果是 complete ，则代表已有缓存
      if (curStatus === "complete") {
        log("正在读取缓存...");
        return Promise.resolve(cache.get(cacheKey));
      }

      // 如果是 pending ，则代表正在请求中，这里放入回调函数
      if (curStatus === "pending") {
        log("有一个相同的请求正在处理中...");
        return new Promise((resolve, reject) => {
          if (callbackMap.has(cacheKey)) {
            callbackMap.get(cacheKey).push({
              onSuccess: resolve,
              onError: reject,
            });
          } else {
            callbackMap.set(cacheKey, [
              {
                onSuccess: resolve,
                onError: reject,
              },
            ]);
          }
        });
      }
    }

    statusMap.set(cacheKey, "pending");

    return fetch(apiUrl, requestOptions)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        log("正在请求接口...");
        const res = response.json();
        statusMap.set(cacheKey, "complete");
        cache.set(cacheKey, res);

        if (callbackMap.has(cacheKey)) {
          callbackMap.get(cacheKey).forEach((callback) => {
            log("正在执行回调函数");
            callback.onSuccess(res);
          });
          // 调用完成之后清掉，用不到了
          callbackMap.delete(cacheKey);
        }

        return res;
      })
      .catch((error) => {
        log("接口请求异常");
        statusMap.delete(cacheKey);
        console.error("Error:", error);
        throw error;
      });
  };

  const queryList = () => {
    makeRequest({
      api: "/api/users",
      method: "GET",
      params: { limit: 5 },
    }).then((data) => {
      setListData([...listData, ...data]);
      console.log(data);
    });
  };

  const multiQuery = () => {
    queryList();
    queryList();
    queryList();
  };

  return (
    <>
      <Space>
        <Button onClick={queryList}>请求单个接口</Button>
        <Button onClick={multiQuery}>请求多个接口</Button>
      </Space>

      <Card style={{ marginTop: 24 }}>
        <List
          itemLayout="horizontal"
          dataSource={listData}
          renderItem={(item, index) => (
            <List.Item>
              <List.Item.Meta title={item?.name} />
            </List.Item>
          )}
        />
      </Card>
    </>
  );
}
