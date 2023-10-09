
---
# Distributed file processing using Node.js Clusters

This Node.js application uses the cluster module to distribute tasks for processing text files and counting word occurrences across multiple worker processes.

## Features
- Implements parallel processing of word counting tasks across multiple worker processes. ✅
- Detailed logging and metrics to measure performance (time taken per file, per worker).✅
- Supports larger files by reading in chunks/streams rather than all at once.✅
- Allow dynamic scaling of workers based on load rather than just num CPUs.✅
- Persist counts to disk periodically in case of crashes.🔜 
- Add authentication between master and workers for security.🔜 
- Allow word blacklist to exclude common words like "the", "and" etc.✅
- Add compression to files being sent between master and workers. 🔜 
- Build a proper CLI interface for configuring options and file inputs.🔜 
- Containerize with Docker for easy deployment and distribution.🔜 
- Automate benchmarking different configurations to tune performance.🔜 
- Support different count aggregation strategies like sum, min, max etc.🔜 
- Add a REST API frontend to submit jobs and query results.🔜 
- Use a proper queue like RabbitMQ to distribute tasks rather than custom logic.🔜 
- Store results in a database rather than just a local file.🔜 

## References:
Implementation is based on [MapReduce: Simplified Data Processing on Large Clusters](https://storage.googleapis.com/pub-tools-public-publication-data/pdf/16cb30b4b92fd4989b8619a61752a2387c6dd474.pdf)

## MapReduce Implementation

This application utilizes a simplified form of the MapReduce paradigm for processing tasks:

- **Mapping**:
  - The master process divides the tasks (input files) among the worker processes.
  - Each worker process reads a file, processes its content, and counts the occurrences of each word.
  - Each worker sends its partial results (word counts) back to the master.

- **Reducing**:
  - The master process collects the partial results from each worker.
  - It aggregates the word counts from all workers to get the final word counts.

This process effectively distributes the workload across multiple processes, allowing for parallel processing and improved performance.


## Prerequisites

- Node.js installed on your system
- Input text files in the `files` directory with filenames starting with `input-`

## Getting Started

1. Clone the repository or download the source code.

```
git clone <https://github.com/aryankanwar/Distributed-Fault-Tolerant-Map-Reduce>
cd word-counting-with-clusters
```

2. Install dependencies (if any).

```
npm install
```

3. Run the application.

```
node master.js
```

## Usage

1. Ensure you have placed input text files in the `files` directory with filenames starting with `input-`.

2. Run the application using the steps outlined in the "Getting Started" section.

3. The application will distribute tasks among worker processes, process the files, and count word occurrences.

4. Once all tasks are completed, the final word counts will be logged to the console and saved to `output.txt`.

## Configuration

- `master.js`: Controls the master process and distributes tasks among workers.
- `worker.js`: Handles the processing of individual tasks.

## Contributing

If you'd like to contribute to this project, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make changes and commit them with descriptive messages.
4. Push your changes to your fork.
5. Open a pull request and describe the changes.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

- [Node.js](https://nodejs.org/)
- [cluster module](https://nodejs.org/api/cluster.html)

---
