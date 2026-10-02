# Contributing to Canvas A11y

1. Fork the repository and create a focused branch.
2. Use Node 22.12+; run `npm ci` and `npm run dev`.
3. Read [the test-case guide](docs/TEST-CASES.md) and current [API status](docs/API-STATUS.md).
4. Add a minimal case with a stable ID, expected behavior, evidence scope and manual instructions where necessary.
5. Run `npm test` and `npm run build`.
6. Exercise the case with the experimental API enabled and disabled. Include exact browser version, OS, flags, API generation and an exported report in the PR. If experimental testing is unavailable, state that explicitly.
7. Keep changes small, JavaScript/JSX only, and avoid dependencies unless they solve a concrete problem.

Do not report accessible names by reading textContent alone. Do not label DOM rectangles as accessibility-tree bounds. Do not dispatch fake Tab events and claim keyboard navigation passed. Missing platform capabilities must be UNSUPPORTED, not PASS.

The app itself must remain keyboard usable. Use native controls, visible focus, meaningful labels, readable contrast and responsive layouts. Test text enlargement and reduced viewports.

Report suspected browser behavior separately from app defects. Include the case fragment URL and revision, expected/actual behavior, setup, diagnostic JSON and manual evidence. Review reports for sensitive notes before posting.

By contributing, you agree that your contributions are licensed under MIT. Discuss substantive changes to geometry methodology or result schema in an issue first.
