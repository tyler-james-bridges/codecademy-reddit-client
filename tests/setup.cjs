const {configure} = require('enzyme');
const Adapter = require('@cfaester/enzyme-adapter-react-18').default;
configure({adapter:new Adapter()});
