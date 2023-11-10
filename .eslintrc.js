/* eslint-disable quote-props */
/* eslint-disable @typescript-eslint/quotes */
/* eslint-disable @typescript-eslint/indent */
module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es2021": true
    },
    "extends": "standard-with-typescript",
    "overrides": [
        {
            "env": {
                "node": true
            },
            "files": [
                ".eslintrc.{js,cjs}"
            ],
            "parserOptions": {
                "sourceType": "script"
            }
        }
    ],
    "parserOptions": {
        "ecmaVersion": "latest"
    },
    "rules": {
      "@typescript-eslint/no-var-requires": 0,
      "@typescript-eslint/consistent-type-imports": 0,
      "@typescript-eslint/prefer-nullish-coalescing": 0,
      "@typescript-eslint/strict-boolean-expressions": 0,
      "@typescript-eslint/restrict-template-expressions": 0
    }
}
