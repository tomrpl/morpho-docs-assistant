import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAI } from "langchain/llms/openai";
import { loadQAStuffChain } from "langchain/chains";
import { Document } from "langchain/document";
import { timeout } from "../config";

export const queryPineconeVectorStoreAndQueryLLM = async (
  client,
  indexName,
  question
) => {
  console.log("Querying Pinecone vector store...");
  const index = client.Index(indexName);
  const queryEmbedding = await new OpenAIEmbeddings({
    modelName: "text-embedding-ada-002",
  }).embedQuery(question);

  let queryResponse = await index.query({
    queryRequest: {
      topK: 10,
      vector: queryEmbedding,
      includeMetadata: true,
      includeValues: true,
    },
  });

  console.log(`Found ${queryResponse.matches.length} matches...`);
  console.log(`Asking question: ${question}...`);

  if (queryResponse.matches.length) {
    const llm = new OpenAI({});
    const chain = loadQAStuffChain(llm);

    const linksSet = new Set();

    const input_documents = queryResponse.matches.map((match) => {
      const linkTitle = match.metadata.linkTitle;
      const docLink = match.metadata.docLink;
      linksSet.add({ link: docLink, title: linkTitle });
      return new Document({
        pageContent: match.metadata.pageContent,
      });
    });

    const result = await chain.call({
      input_documents: input_documents,
      question: question,
    });

    console.log(`Answer: ${result.text}`);

    const links = Array.from(linksSet);

    return { answer: result.text, links: links };
  } else {
    console.log("Since there are no matches, GPT will not be queried.");
    return { answer: "There are no matches", links: [] };
  }
};

export const createPineconeIndex = async (
  client,
  indexName,
  vectorDimension
) => {
  // 1. Initiate index existence check
  console.log(`Checking "${indexName}"...`);
  // 2. Get list of existing indexes
  const existingIndexes = await client.listIndexes();
  // 3. If index doesn't exist, create it
  if (!existingIndexes.includes(indexName)) {
    // 4. Log index creation initiation
    console.log(`Creating "${indexName}"...`);
    // 5. Create index
    await client.createIndex({
      createRequest: {
        name: indexName,
        dimension: vectorDimension,
        metric: "cosine",
      },
    });
    // 6. Log successful creation
    console.log(
      `Creating index.... please wait for it to finish initializing.`
    );
    // 7. Wait for index initialization
    await new Promise((resolve) => setTimeout(resolve, timeout));
  } else {
    // 8. Log if index already exists
    console.log(`"${indexName}" already exists.`);
  }
};

export const updatePinecone = async (client, indexName, docs) => {
  console.log("Retrieving Pinecone index...");
  const index = client.Index(indexName);
  console.log(`Pinecone index retrieved: ${indexName}`);

  for (const doc of docs) {
    console.log(`Processing document: ${doc.metadata.source}`);
    const txtPath = doc.metadata.source;
    const lines = doc.pageContent.split("\n");

    // Extract link and title, removing prefixes
    const documentLink = lines[0] ? lines[0].replace("Link: ", "") : "";
    const documentTitle = lines[1] ? lines[1].replace("Title: ", "") : "";

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
    });
    console.log("Splitting text into chunks...");

    const chunks = await textSplitter.createDocuments([
      lines.slice(2).join("\n"),
    ]); // Exclude the first two lines from the chunks

    console.log(`Text split into ${chunks.length} chunks`);
    console.log(
      `Calling OpenAI's Embedding endpoint documents with ${chunks.length} text chunks ...`
    );

    const embeddingsArrays = await new OpenAIEmbeddings().embedDocuments(
      chunks.map((chunk) => chunk.pageContent.replace(/\n/g, " "))
    );

    console.log("Finished embedding documents");
    console.log(
      `Creating ${chunks.length} vectors array with id, values, and metadata...`
    );

    const batchSize = 100;
    let batch: any = [];

    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = chunks[idx];
      const vector = {
        id: `${txtPath}_${idx}`,
        values: embeddingsArrays[idx],
        metadata: {
          ...chunk.metadata,
          loc: JSON.stringify(chunk.metadata.loc),
          pageContent: chunk.pageContent,
          txtPath: txtPath,
          docLink: documentLink,
          linkTitle: documentTitle,
        },
      };

      batch = [...batch, vector];

      if (batch.length === batchSize || idx === chunks.length - 1) {
        await index.upsert({
          upsertRequest: {
            vectors: batch,
          },
        });

        batch = [];
      }
    }

    console.log(`Pinecone index updated with ${chunks.length} vectors`);
  }
};
