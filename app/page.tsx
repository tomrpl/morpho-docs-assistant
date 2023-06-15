"use client";
import { useState, useEffect, useRef } from "react";

import Header from "./header";

export default function Home() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("");
  const [displayedResult, setDisplayedResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Asking AI");
  const [links, setLinks] = useState<Array<{ link: string; title: string }>>(
    []
  );

  const resultIndex = useRef(0);

  useEffect(() => {
    let timeout;
    if (loading) {
      timeout = setTimeout(() => {
        setLoadingText((prevText) =>
          prevText === "Asking AI..." ? "Asking AI" : `${prevText}.`
        );
      }, 700); // Change text every 500ms
    } else {
      setLoadingText("Asking AI"); // Reset to original when not loading
    }
    return () => clearTimeout(timeout); // Clear timeout on unmount
  }, [loading, loadingText]);

  useEffect(() => {
    if (result !== "") {
      setLoading(false);
    }
  }, [result]);

  useEffect(() => {
    let interval;
    if (!loading && result) {
      resultIndex.current = -1; // Set result index to -1
      interval = setInterval(() => {
        resultIndex.current += 1; // Increment the result index at the start of each interval
        if (resultIndex.current < result.length) {
          console.log("Current resultIndex:", resultIndex.current);
          setDisplayedResult((prevResult) => {
            console.log("Adding character at index:", resultIndex.current);
            return prevResult + result[resultIndex.current];
          });
        } else {
          clearInterval(interval);
        }
      }, 10); // Change this to adjust the speed of the typing effect
    }
    return () => clearInterval(interval); // Clear interval on unmount
  }, [loading, result]);

  async function createIndexAndEmbeddings() {
    try {
      const result = await fetch("/api/setup", {
        method: "POST",
      });
      const json = await result.json();
      console.log("result: ", json);
    } catch (err) {
      console.log("err:", err);
    }
  }

  async function sendQuery() {
    if (!query) return;
    setResult("");
    setDisplayedResult(""); // Reset displayed result when a new query is sent
    resultIndex.current = 0; // Reset result index
    setLoading(true);
    try {
      const result = await fetch("/api/read", {
        method: "POST",
        body: JSON.stringify(query),
      });
      const json = await result.json();
      console.log("json result is: ", json);
      console.log("json data is: ", json.data);

      // Check if the result ends with "undefined" and remove it if necessary
      setResult(
        json.data.endsWith("undefined")
          ? json.data.substring(0, json.data.length - "undefined".length)
          : json.data
      );
      console.log("Result after setting state:", result);

      setLinks(json.links);
      // Do not set loading here
    } catch (err) {
      console.log("err:", err);
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-col items-center">
      <Header />
      <p className="text-gray-400 text-center px-5 mb-10">
        An AI assistant to help developers & users to be answered and redirected
        to the right source documentation.
      </p>
      <div className="w-full">
        <input
          className="border border-gray-300 rounded px-2 py-1 text-black w-full"
          placeholder="Ask a question..."
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <button
        className="px-7 py-2 rounded-2xl bg-white text-black mt-4"
        onClick={sendQuery}
      >
        {loading ? (
          <span>{loadingText}</span>
        ) : (
          <span>Ask Mascot & wait a few seconds</span>
        )}
      </button>

      {displayedResult && (
        <div className="mt-4 mb-9 mx-2 text-white">
          {displayedResult
            .trim() // Trim leading and trailing spaces
            .split(". ")
            .filter((sentence) => sentence) // Remove any empty strings
            .map((sentence, index) => (
              <p key={index}>{sentence}.</p>
            ))}
          <p> </p>
          {links.length > 0 && (
            <>
              <hr />
              <p>👇🏼 </p>
              <p>Related Links: </p>
              <ul>
                {Array.from(
                  new Set(
                    links
                      .filter((link) => link.link && link.title)
                      .map((link) => link.link)
                  )
                )
                  .slice(0, 3)
                  .map((link, index) => (
                    <li key={index}>
                      -{" "}
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#E7CDF8",
                          textDecoration: "underline",
                        }}
                      >
                        {links.find((item) => item.link === link)?.title}
                      </a>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </div>
      )}

      <button
        className="px-4 py-1 rounded-2xl bg-white text-black mt-4"
        onClick={createIndexAndEmbeddings}
      >
        Create index and embeddings
      </button>
    </main>
  );
}
