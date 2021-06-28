/**
 * Created by tsadik on 11/8/17.
 */

import {Link} from "./link";
import {Node} from "./node";

export interface Graph {
  nodes: Node[];
  links: Link[];
}
