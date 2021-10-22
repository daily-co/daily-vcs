import * as React from 'react';
import {Box, Image, Video} from '../src/react-api/component';
import {useVideoTime} from '../src/react-api/hook';


const layoutFns = {
  cornerBug: parentFrame => {
    
  },
  test: parentFrame => {
    
  },
};


export default function HelloDailyVCS(props) {

  const t = useVideoTime();
  if (t > 2) console.log("using cornerBug")

  return (
    <Box id="main">
      <Video id="video1" />
      <Image id="image1" layoutFn={t > 2 ? layoutFns.cornerBug : layoutFns.test} />
    </Box>
  )
}
