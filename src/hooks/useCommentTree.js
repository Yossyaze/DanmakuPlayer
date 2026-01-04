import { useMemo } from 'react';

const useCommentTree = (comments, enableTreeView) => {
  const buildTree = (inputComments) => {
    // 0. 仮想化用フラットリスト（ツリー無効時）
    if (!enableTreeView) {
      return inputComments.map((c) => ({ ...c, depth: 0, children: [] }));
    }

    // 1. ノードの準備とマッピング
    // IDの重複排除も兼ねてMapを作成
    const nodeMap = new Map();
    inputComments.forEach((c) => {
      // 既存のchildren等はリセットして新しいオブジェクトを作る
      // parentId: null で初期化し、後で親が見つかったらセットする
      nodeMap.set(c.id, { ...c, children: [], parentId: null });
    });

    // 2. レス番とIDの対応表を作成
    const resNumMap = new Map();
    for (const node of nodeMap.values()) {
      if (node.originalResNum) {
        // ファイルIDとの組み合わせを優先 (例: "file1-100")
        resNumMap.set(`${node.sourceFileId}-${node.originalResNum}`, node.id);

        // グローバルなレス番も保持（フォールバック用）
        // 既に登録されている場合は上書きしない（最初の出現を優先）
        if (!resNumMap.has(node.originalResNum)) {
          resNumMap.set(node.originalResNum, node.id);
        }
      }
    }

    // 3. ツリー構造の構築
    for (const node of nodeMap.values()) {
      // アンカーの検出 (半角>>, 全角＞＞, HTMLエンティティ, 前後の空白許容)
      const match = node.text.match(/(?:>>|＞＞|&gt;&gt;)\s*(\d+)/);
      if (match) {
        const targetResNum = parseInt(match[1]);

        // まずファイル内での一致を試みる
        let parentId = resNumMap.get(`${node.sourceFileId}-${targetResNum}`);

        // Strict mode: file-specific logic only
        // 見つからなければ全体から探す -> 廃止 (ユーザー要望: 同一スレッド内のみ)
        /* if (!parentId) {
                    parentId = resNumMap.get(targetResNum);
                } */

        // 親が見つかり、かつ自分自身でなければリンク
        if (parentId && parentId !== node.id) {
          const parent = nodeMap.get(parentId);
          if (parent) {
            parent.children.push(node);
            node.parentId = parentId; // 親IDをセットすることでルートから除外するフラグにする
          }
        }
      }
    }

    // 4. ルートノードの抽出（親を持たないノード）
    // 時間順にソートしてから抽出
    const allNodes = Array.from(nodeMap.values()).sort((a, b) => a.time - b.time);
    const roots = allNodes.filter((node) => !node.parentId);

    // 5. 子ノードのソート（再帰的）
    const sortChildren = (nodes) => {
      nodes.forEach((node) => {
        if (node.children.length > 0) {
          node.children.sort((a, b) => a.time - b.time);
          sortChildren(node.children);
        }
      });
    };
    sortChildren(roots);

    // 6. フラット化（仮想化対応）+ rootId の追加
    const flattened = [];
    const flatten = (nodes, depth, rootId = null) => {
      for (const node of nodes) {
        // For root nodes (depth 0), the rootId is their own id
        const currentRootId = depth === 0 ? node.id : rootId;
        flattened.push({ ...node, depth, rootId: currentRootId });
        if (node.children.length > 0) {
          flatten(node.children, depth + 1, currentRootId);
        }
      }
    };
    flatten(roots, 0);

    return flattened;
  };

  return useMemo(() => buildTree(comments), [comments, enableTreeView]);
};

export default useCommentTree;
