async function bootstrap() {
  // Placeholder worker process for ingestion, embeddings, indexing, and analytics jobs.
  // Concrete queues/jobs will be added with the data model and RAG implementation tasks.
  console.log('Tanya worker started');

  await new Promise<void>((resolve) => {
    const shutdown = () => resolve();

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  });
}

void bootstrap();
