# Testing

## Runner alignment

- Use **one** primary runner (**`bun test`**, **Vitest**, **Node test**, etc.) as wired in **`package.json`** and CI; do not add a second default for the same package.

## Determinism

- Mock **clock**, **random**, **network**, and **filesystem** when tests would otherwise be flaky; reset mocks between tests per framework conventions.

## Async tests

- Use the framework’s **`async` test** forms; always **assert both success and failure** paths for critical branches.

## Snapshots

- Update snapshots deliberately; large snapshot churn deserves review like any generated artifact.
