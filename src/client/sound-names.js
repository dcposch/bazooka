import fs from 'fs'

const names = fs.readdirSync('static/sounds')

// TODO: delete once this bug is fixed:
// https://github.com/parcel-bundler/parcel/issues/1736
export default names
