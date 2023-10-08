// import { Fragment, useRef, useState } from "react";
// import useVirtual, { LoadMore } from "react-cool-virtual";

// import "./styles.scss";

// //const TOTAL_COMMENTS = 500;
// //const BATCH_COMMENTS = 5;

// // We only have 50 (500 / 5) batches of items, so set the 51th (index = 50) batch as `true`
// // to avoid the `loadMore` callback from being invoked, yep it's a trick 😉

// //let currentIndex = -1;

// // const Loading = ({ show }) => {
// //   console.log("CurrentIndex: ", currentIndex, " - Show:", show);
// //   if (currentIndex === 0) {
// //     console.log("Simlate more call: ", currentIndex);
// //   }

// //   return <div className="item">⏳ Loading...</div>;
// // };

// // const loadData = async ({ loadIndex }, setComments) => {
// //   console.log("LoadData  Called:", loadIndex);
// //   currentIndex = loadIndex;
// //   // Set the state of a batch items as `true`
// //   // to avoid the callback from being invoked repeatedly

// //   try {
// //     // Simulating a slow network
// //     await sleep(100);

// //     const { data: comments } = await axios(
// //       `https://jsonplaceholder.typicode.com/comments?postId=${loadIndex + 1}`
// //     );

// //     setComments((prevComments) => [...prevComments, ...comments]);
// //   } catch (err) {
// //     // If there's an error set the state back to `false`
// //     isItemLoadedArr[loadIndex] = false;
// //     // Then try again
// //     loadData({ loadIndex }, setComments);
// //   }
// // };

// type InfiniteScrollProps = {
//     feedId: string;
//     items: any[];
//     children: React.ReactNode;
//     loadMore: LoadMore;
//     hasMore: boolean;
//     loadMoreCount: number;
//     };

// const InfiniteScroll = (props: InfiniteScrollProps) => {

//     const batchLoaded = useRef<Array<boolean>>([]);

// //  const [comments, setComments] = useState([]);
//   const { outerRef, innerRef, items } = useVirtual({
//     // Provide the number of comments
//     itemCount: props.items.length,
//     // Starts to pre-fetch data when the user scrolls within every 5 items
//     // e.g. 1 - 5, 6 - 10 and so on (default = 15)
//     loadMoreCount: props.loadMoreCount,
//     // Provide the loaded state for a batch items to tell the hook
//     // whether the `loadMore` should be triggered or not
//     isItemLoaded: (loadIndex) => batchLoaded[loadIndex] || !props.hasMore,
//     // The callback will be invoked when more data needs to be loaded
//     loadMore: (e) => {
//         props.loadMore(e); // Loads more data into the items array
//         batchLoaded.current[e.loadIndex] = true;
//     } 
//   });

//   return (
//     <div
//       className="outer"
//       style={{ width: "300px", height: "100vh", overflow: "auto" }}
//       ref={outerRef}
//     >
//       <div ref={innerRef}>
//         {items.length ? (
//           items.map(({ index, measureRef }) => {
//             // const showLoading =
//             //   index === comments.length - 1 && comments.length < TOTAL_COMMENTS;

//             return (
//               <Fragment key={props.feedId + index}>

//                 <children index={index} item={props.items[index]} ref={measureRef} />
//               </Fragment>
//             );
//           })
//         ) : (
//           <Loading />
//         )}
//       </div>
//     </div>
//   );
// };

// export default InfiniteScroll;