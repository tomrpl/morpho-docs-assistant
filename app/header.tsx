import React from "react";
import { FaDiscord, FaTwitter, FaMedium } from "react-icons/fa";

const Header = () => {
  return (
    <header className="mt-8 flex justify-between items-center mb-8 w-full">
      <div className="flex-1 "></div>
      <div className="flex-1 flex flex-col items-center justify-center px-100">
        <h1 className="text-2xl font-bold text-white px-100 ">ButterflyGPT</h1>
      </div>

      <div className="flex-1 flex space-x-4 items-center justify-end">
        <a
          href="https://discord.com/invite/BWXbJMHMdz"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaDiscord size={24} color="#7289da" />
        </a>
        <a
          href="https://twitter.com/TomReppelin"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaTwitter size={24} color="#1DA1F2" />
        </a>
        <a
          href="https://medium.com/morpho-labs"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FaMedium size={24} color="#66cdaa" />
        </a>
      </div>
    </header>
  );
};

export default Header;
