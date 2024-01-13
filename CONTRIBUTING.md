# Getting Started for Development

1. Fork the repository.
2. Clone the forked repository to your local machine.
3. Start development server with docker-compose

```
docker-compose up -d
```

4. Open http://localhost:8888/ in your browser.

## Testing

To run the tests for this project, use the following command:

```
docker-compose exec notebook bash -c "cd work && python -m pytest"
```
