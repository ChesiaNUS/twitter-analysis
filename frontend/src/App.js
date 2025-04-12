import React, { useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import './App.css';



function App() {
  const [fileData, setFileData] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [referenceTweet, setReferenceTweet] = useState("");
  const [generatedTweets, setGeneratedTweets] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet);

      console.log("Parsed File Data:", jsonData);

      if (
        jsonData.length > 0 &&
        jsonData[0].hasOwnProperty("user_screen_name") &&
        jsonData[0].hasOwnProperty("tweet_time") &&
        jsonData[0].hasOwnProperty("tweet_text")
      ) {
        setFileData(jsonData);
      } else {
        alert("文件格式不正确，请确保包含 user_screen_name, tweet_time, tweet_text 列！");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const analyzeTweets = async () => {
    if (!fileData) {
      alert("请先上传文件！");
      return;
    }

    console.log("File data size:", JSON.stringify(fileData).length, "bytes");

    setLoading(true);
    try {
      // Update the backend URL to match the port
      const response = await axios.post("http://localhost:3001/analyze", {
        data: fileData,
        keyword: keyword,
        referenceTweet: referenceTweet,
      });

      console.log("API Response:", response.data);

      if (response.data && response.data.generatedTweets) {
        setGeneratedTweets(response.data.generatedTweets);
      } else {
        alert("API 返回的数据为空或格式不正确！");
      }
    } catch (error) {
      if (error.response) {
        // 服务器返回了响应，但状态码不是 2xx
        console.error("服务器错误：", error.response.status, error.response.data);
        alert(`服务器错误：${error.response.status} - ${error.response.data.message || "未知错误"}`);
      } else if (error.request) {
        // 请求已发送，但未收到响应
        console.error("未收到服务器响应：", error.request);
        alert("未收到服务器响应，请检查后端服务器是否启动！");
      } else {
        // 其他错误
        console.error("请求错误：", error.message);
        alert(`请求错误：${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const rateTweet = (index, rating) => {
    const tweet = generatedTweets[index];
    setHistory([...history, { ...tweet, rating }]);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8">
      <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
          Twitter Analysis Tool
        </h1>

        {/* File upload */}
        <div className="mb-6">
          <label className="block text-lg font-medium text-gray-700 mb-2">
            Upload File:
          </label>
          <input
            type="file"
            accept=".xlsx, .csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
          />
        </div>

        {/* Input keywords */}
        <div className="mb-6">
          <label className="block text-lg font-medium text-gray-700 mb-2">
            Input Keywords(optional):
          </label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="Input keyword (e.g.: Defi)"
          />
        </div>

        {/* Input article to learn to */}
        <div className="mb-6">
          <label className="block text-lg font-medium text-gray-700 mb-2">
            Article to learn to (Optional):
          </label>
          <textarea
            value={referenceTweet}
            onChange={(e) => setReferenceTweet(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            placeholder="Input the article to learn to (e.g.: Defi)"
          />
        </div>

        {/* Analyze */}
        <button
          onClick={analyzeTweets}
          className="w-full bg-blue-500 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-600 transition"
        >
          Analyze
        </button>

        {loading && <p className="text-blue-500">正在分析推文，请稍候...</p>}

        {/* Output */}
        {generatedTweets.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Output Tweets:
            </h2>
            {generatedTweets.map((tweet, index) => (
              <div
                key={index}
                className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-4"
              >
                <p className="text-gray-700">{tweet.content}</p>
                <div className="mt-2 flex justify-end space-x-2">
                  <button
                    onClick={() => rateTweet(index, "good")}
                    className="bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition"
                  >
                    Good
                  </button>
                  <button
                    onClick={() => rateTweet(index, "bad")}
                    className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition"
                  >
                    Bad
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              History:
            </h2>
            {history.map((item, index) => (
              <div
                key={index}
                className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-4"
              >
                <p className="text-gray-700">{item.content}</p>
                <p className="text-sm text-gray-500">评分: {item.rating}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
