/**
 * Created by tsadik on 11/8/17.
 */


export interface Node {
  id: string;
  name: string;
  group?: string;
  type?: string;
  av: any;
  tv: any;
  incoming: number [];
  outgoing: number [];
}
